using Microsoft.Extensions.Logging;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Authorization;

/// <summary>
/// Grant-based authorization over the collaboration aggregates (B2B-10 F3).
/// </summary>
/// <remarks>
/// <para>
/// Every refusal is logged with the tenant, the agreement and the capability, because the
/// questions that follow a denial ("who was it, what did they want, was the grant revoked or did
/// it lapse?") cannot be answered afterwards from a bare 403.
/// </para>
/// <para>
/// <b>The decision is deliberately concentrated here</b> so that reversing the scope of grant
/// enforcement — should root decide the agreement itself must be grant-gated as well — is one
/// method call, not a search through the endpoint layer.
/// </para>
/// </remarks>
public sealed class CollaborationAccessGuard(
    ICollaborationCallerContext callerContext,
    IAgreementRepository agreements,
    TimeProvider clock,
    ILogger<CollaborationAccessGuard> logger) : ICollaborationAccessGuard
{
    /// <inheritdoc />
    public async Task<CollaborationAgreement> EnsureParticipationAsync(
        Guid agreementId,
        Guid claimedActorTenantId,
        CancellationToken cancellationToken = default)
    {
        var caller = ResolveAndVerifyActor(claimedActorTenantId);

        var agreement = await agreements.GetByIdAsync(agreementId, cancellationToken);

        // Absent and not-mine are the same answer. Splitting them would turn this endpoint into
        // an oracle for "does agreement X exist", which is exactly what a third tenant would ask.
        if (agreement is null || !IsParty(agreement, caller.TenantId))
        {
            logger.LogWarning(
                "Collaboration access refused: tenant {TenantId} is not a party to agreement {AgreementId} (or it does not exist).",
                caller.TenantId,
                agreementId);

            throw new CollaborationResourceNotFoundException(nameof(CollaborationAgreement), agreementId);
        }

        return agreement;
    }

    /// <inheritdoc />
    public async Task<CollaborationAgreement> EnsureCapabilityAsync(
        Guid agreementId,
        Guid claimedActorTenantId,
        string capability,
        CancellationToken cancellationToken = default)
    {
        // A mistyped capability can never be satisfied by any grant, so without this check it
        // would present itself as a permission problem and send someone looking for a missing
        // grant that was never the issue.
        if (!CollaborationCapability.IsKnown(capability))
        {
            logger.LogError(
                "Collaboration access check asked for the unknown capability '{Capability}' on agreement {AgreementId}.",
                capability,
                agreementId);

            throw new CollaborationAccessDeniedException(capability, CollaborationDenialReason.UnknownCapability);
        }

        var agreement = await EnsureParticipationAsync(agreementId, claimedActorTenantId, cancellationToken);
        var caller = callerContext.Current;

        // The host issues the grants on its own agreement; requiring it to hold one would mean
        // granting yourself permission to permit.
        if (caller.TenantId == agreement.HostTenantId)
        {
            return agreement;
        }

        var now = clock.GetUtcNow();

        if (agreement.HasActiveGrantFor(capability, now))
        {
            return agreement;
        }

        var reason = ExplainRefusal(agreement, capability, now);

        logger.LogWarning(
            "Collaboration access refused: tenant {TenantId} has no active '{Capability}' grant on agreement {AgreementId} ({Reason}).",
            caller.TenantId,
            capability,
            agreementId,
            reason);

        throw new CollaborationAccessDeniedException(capability, reason);
    }

    private CollaborationCaller ResolveAndVerifyActor(Guid claimedActorTenantId)
    {
        var caller = callerContext.Current;

        if (claimedActorTenantId != caller.TenantId)
        {
            logger.LogWarning(
                "Collaboration request from tenant {CallerTenantId} claimed to act as tenant {ClaimedTenantId}.",
                caller.TenantId,
                claimedActorTenantId);

            throw new CollaborationActorMismatchException(caller.TenantId, claimedActorTenantId);
        }

        return caller;
    }

    private static bool IsParty(CollaborationAgreement agreement, Guid tenantId)
        => tenantId == agreement.HostTenantId || tenantId == agreement.GuestTenantId;

    /// <summary>Names the refusal for the log; the response body never carries it.</summary>
    private static CollaborationDenialReason ExplainRefusal(
        CollaborationAgreement agreement,
        string capability,
        DateTimeOffset atUtc)
    {
        var issued = agreement.GrantsFor(capability);

        if (issued.Count == 0)
            return CollaborationDenialReason.NoGrant;

        if (issued.Any(grant => grant.Status == ParticipantGrantStatus.Revoked))
            return CollaborationDenialReason.GrantRevoked;

        if (issued.Any(grant => grant.ExpiresAtUtc.HasValue && grant.ExpiresAtUtc.Value <= atUtc))
            return CollaborationDenialReason.GrantExpired;

        return CollaborationDenialReason.NoGrant;
    }
}
