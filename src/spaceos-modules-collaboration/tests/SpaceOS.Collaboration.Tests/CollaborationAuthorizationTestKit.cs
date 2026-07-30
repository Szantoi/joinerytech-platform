using Microsoft.Extensions.Logging.Abstractions;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// Shared pieces for exercising the B2B-10 F3 authorization guard.
/// </summary>
/// <remarks>
/// <b>These build the REAL guard, never a permissive stand-in.</b> A test double that always says
/// "allowed" would keep every existing handler test green while the guard rotted underneath it —
/// the same shape of mistake as an RLS suite that sets the session key by hand and therefore never
/// runs the interceptor it claims to cover (B2B-10 F2 platform finding).
/// </remarks>
internal static class AuthKit
{
    /// <summary>A clock the test controls, so grant expiry can be placed on either side of "now".</summary>
    internal sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    /// <summary>The authenticated caller, as the API host would resolve it from the token.</summary>
    internal sealed class TestCallerContext(Guid tenantId, Guid userId) : ICollaborationCallerContext
    {
        public CollaborationCaller Current { get; } = CollaborationCaller.Create(tenantId, userId);
    }

    /// <summary>A caller context that has nobody — what an unauthenticated path looks like.</summary>
    internal sealed class UnresolvedCallerContext : ICollaborationCallerContext
    {
        public CollaborationCaller Current
            => throw new CollaborationCallerUnresolvedException("No authenticated caller in this test.");
    }

    /// <summary>Single-agreement repository that counts loads, so "never looked" can be asserted.</summary>
    internal sealed class InMemoryAgreementRepository(CollaborationAgreement? seed) : IAgreementRepository
    {
        private CollaborationAgreement? _stored = seed;

        public int LoadCount { get; private set; }

        public int SaveCount { get; private set; }

        public Task<CollaborationAgreement?> GetByIdAsync(Guid agreementId, CancellationToken cancellationToken = default)
        {
            LoadCount++;
            return Task.FromResult(_stored?.Id == agreementId ? _stored : null);
        }

        public Task AddAsync(CollaborationAgreement agreement, CancellationToken cancellationToken = default)
        {
            _stored = agreement;
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    /// <summary>Builds the real guard over one agreement, for a given caller.</summary>
    internal static CollaborationAccessGuard Guard(
        CollaborationAgreement? agreement,
        Guid callerTenantId,
        Guid callerUserId,
        DateTimeOffset now,
        IAgreementRepository? repository = null)
        => new(
            new TestCallerContext(callerTenantId, callerUserId),
            repository ?? new InMemoryAgreementRepository(agreement),
            new FixedClock(now),
            NullLogger<CollaborationAccessGuard>.Instance);
}
