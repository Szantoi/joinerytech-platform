using System.Collections.Concurrent;
using SpaceOS.Collaboration.Application.Idempotency;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// An idempotency store for the endpoint tests — and only for them.
/// </summary>
/// <remarks>
/// <para>
/// <b>What this can prove:</b> that the middleware claims, replays, refuses reuse and abandons on
/// failure — i.e. the HTTP behaviour built on top of the store contract.
/// </para>
/// <para>
/// <b>What it cannot prove, and is not asked to:</b> that the real store survives a restart, keeps
/// one tenant's keys away from another's, or decides the race between two simultaneous retries.
/// Those live in the unique index and the RLS policy, and are measured against PostgreSQL in
/// <c>IdempotencyStoreTests</c>. Asserting them here would be measuring a mirror — the same
/// mistake the platform made with the tenant interceptor (B2B-10 F2 finding).
/// </para>
/// </remarks>
internal sealed class InMemoryIdempotencyStore : IIdempotencyStore
{
    private sealed record Entry(string Fingerprint, int? StatusCode, string? Body, bool Completed);

    private readonly ConcurrentDictionary<(Guid Tenant, string Key), Entry> _entries = new();

    /// <summary>Lets a test park a key as if another request were mid-flight.</summary>
    public void MarkInFlight(Guid tenantId, string key, string fingerprint)
        => _entries[(tenantId, key)] = new Entry(fingerprint, null, null, Completed: false);

    public int Count => _entries.Count;

    public Task<IdempotencyClaim> ClaimAsync(
        Guid tenantId, string key, string fingerprint, CancellationToken cancellationToken = default)
    {
        var claimed = new Entry(fingerprint, null, null, Completed: false);
        var entry = _entries.GetOrAdd((tenantId, key), claimed);

        if (ReferenceEquals(entry, claimed))
        {
            return Task.FromResult(new IdempotencyClaim(IdempotencyOutcome.Started));
        }

        if (!entry.Completed)
        {
            return Task.FromResult(new IdempotencyClaim(IdempotencyOutcome.InFlight));
        }

        return Task.FromResult(entry.Fingerprint == fingerprint
            ? new IdempotencyClaim(IdempotencyOutcome.Replay, entry.StatusCode, entry.Body)
            : new IdempotencyClaim(IdempotencyOutcome.FingerprintMismatch));
    }

    public Task CompleteAsync(
        Guid tenantId, string key, int statusCode, string body, CancellationToken cancellationToken = default)
    {
        _entries.AddOrUpdate(
            (tenantId, key),
            _ => new Entry(string.Empty, statusCode, body, Completed: true),
            (_, existing) => existing with { StatusCode = statusCode, Body = body, Completed = true });

        return Task.CompletedTask;
    }

    public Task AbandonAsync(Guid tenantId, string key, CancellationToken cancellationToken = default)
    {
        _entries.TryRemove((tenantId, key), out _);
        return Task.CompletedTask;
    }
}
