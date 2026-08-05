using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SpaceOS.Projects.Application.Idempotency;

namespace SpaceOS.Projects.Infrastructure.Data;

/// <summary>
/// Durable idempotency records in the module's own database (PROJ-06; the collaboration
/// module's proven B2B-10 F3/3 mechanics, unchanged).
/// </summary>
/// <remarks>
/// <para>
/// The claim is made by <b>inserting</b> and letting the unique index arbitrate, not by reading
/// first and inserting after — a read-then-write would let two retries milliseconds apart both
/// through the gap, which is the exact failure this class exists to prevent.
/// </para>
/// <para>
/// <b>Stalled claims are reclaimed</b> after <see cref="StaleClaimAfter"/>, or a process dying
/// between claim and answer would block that key forever.
/// </para>
/// <para>
/// <b>Known limit, stated rather than hidden:</b> completed records are never pruned here — the
/// same operations debt the collaboration module already carries (a scheduled delete by age),
/// tracked as one platform item, not solved twice differently.
/// </para>
/// </remarks>
public sealed class EfIdempotencyStore(
    ProjectsDbContext database,
    TimeProvider clock,
    ILogger<EfIdempotencyStore> logger) : IIdempotencyStore
{
    /// <summary>How long an unfinished claim is honoured before it is taken to be abandoned.</summary>
    public static readonly TimeSpan StaleClaimAfter = TimeSpan.FromMinutes(5);

    /// <inheritdoc />
    public async Task<IdempotencyClaim> ClaimAsync(
        Guid tenantId, string key, string fingerprint, CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow();

        var existing = await FindAsync(tenantId, key, cancellationToken).ConfigureAwait(false);

        if (existing is null)
        {
            database.Set<ProjectIdempotencyRecord>().Add(new ProjectIdempotencyRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Key = key,
                Fingerprint = fingerprint,
                ClaimedAtUtc = now
            });

            try
            {
                await database.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return new IdempotencyClaim(IdempotencyOutcome.Started);
            }
            catch (DbUpdateException exception)
            {
                // Somebody claimed it between the read and the insert — precisely the race the
                // unique index is here to decide. Whoever lost re-reads and reports what it finds.
                database.ChangeTracker.Clear();
                logger.LogInformation(
                    exception,
                    "Idempotency key claim for tenant {TenantId} lost the insert race; re-reading.",
                    tenantId);

                existing = await FindAsync(tenantId, key, cancellationToken).ConfigureAwait(false);

                if (existing is null)
                {
                    // The insert failed for something other than the race; do not hide it.
                    throw;
                }
            }
        }

        if (existing.CompletedAtUtc is null)
        {
            if (now - existing.ClaimedAtUtc < StaleClaimAfter)
            {
                return new IdempotencyClaim(IdempotencyOutcome.InFlight);
            }

            logger.LogWarning(
                "Reclaiming a stalled idempotency key for tenant {TenantId}: claimed at {ClaimedAt}.",
                tenantId,
                existing.ClaimedAtUtc);

            existing.Fingerprint = fingerprint;
            existing.ClaimedAtUtc = now;
            await database.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return new IdempotencyClaim(IdempotencyOutcome.Started);
        }

        if (!string.Equals(existing.Fingerprint, fingerprint, StringComparison.Ordinal))
        {
            return new IdempotencyClaim(IdempotencyOutcome.FingerprintMismatch);
        }

        return new IdempotencyClaim(IdempotencyOutcome.Replay, existing.StatusCode, existing.Body);
    }

    /// <inheritdoc />
    public async Task CompleteAsync(
        Guid tenantId, string key, int statusCode, string body, CancellationToken cancellationToken = default)
    {
        var record = await FindAsync(tenantId, key, cancellationToken).ConfigureAwait(false);

        if (record is null)
        {
            return;
        }

        record.StatusCode = statusCode;
        record.Body = body;
        record.CompletedAtUtc = clock.GetUtcNow();

        await database.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task AbandonAsync(Guid tenantId, string key, CancellationToken cancellationToken = default)
    {
        var record = await FindAsync(tenantId, key, cancellationToken).ConfigureAwait(false);

        if (record is null)
        {
            return;
        }

        database.Set<ProjectIdempotencyRecord>().Remove(record);
        await database.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private Task<ProjectIdempotencyRecord?> FindAsync(
        Guid tenantId, string key, CancellationToken cancellationToken)
        => database.Set<ProjectIdempotencyRecord>()
            .FirstOrDefaultAsync(
                record => record.TenantId == tenantId && record.Key == key, cancellationToken);
}
