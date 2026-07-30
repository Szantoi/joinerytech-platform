using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Authorization;

/// <summary>
/// The single place that decides whether the authenticated caller may touch a collaboration
/// (B2B-10 F3).
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this exists at all.</b> F2 put row-level security under the module and root drew the
/// line there: <i>RLS filters PARTICIPATION, the grant governs PERMISSION</i>. Participation is
/// what the database can express — a row is visible to its two parties. Permission is not: a
/// guest that is party to an agreement may still have no right to move the work it carries, and a
/// revoked grant must stop it immediately without any row disappearing. Until this type existed,
/// <see cref="CollaborationParticipantGrant.IsActive"/> had no callers: the module issued
/// permissions and never read one.
/// </para>
/// <para>
/// <b>The scope of grant enforcement (root confirmation requested).</b> The agreement itself is
/// participation-based: the guest may read and answer (accept/reject) an agreement it is party to
/// without holding any grant. Requiring one would be circular — grants are issued
/// <i>by</i> the agreement (<see cref="CollaborationAgreement.AddGrant"/>), so a guest unable to
/// accept without a grant could never reach the state where grants mean anything. What the
/// agreement CARRIES — the delegated work packages — is grant-gated.
/// </para>
/// </remarks>
public interface ICollaborationAccessGuard
{
    /// <summary>
    /// Confirms the caller is a party to the agreement, and returns it.
    /// </summary>
    /// <param name="agreementId">Agreement being acted on.</param>
    /// <param name="claimedActorTenantId">
    /// The tenant the request says is acting. Checked against the authenticated caller before
    /// anything else — this is the body/header spoofing gate.
    /// </param>
    /// <param name="cancellationToken">Cancellation.</param>
    /// <returns>The agreement, so the caller does not load it twice.</returns>
    /// <exception cref="CollaborationActorMismatchException">The payload named another tenant.</exception>
    /// <exception cref="CollaborationResourceNotFoundException">Absent, or the caller is not a party.</exception>
    Task<CollaborationAgreement> EnsureParticipationAsync(
        Guid agreementId,
        Guid claimedActorTenantId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Confirms the caller may exercise <paramref name="capability"/> on the agreement.
    /// </summary>
    /// <remarks>
    /// The host needs no grant on its own agreement: it is the party that issues them. The guest
    /// needs one that is active at the current instant.
    /// </remarks>
    /// <exception cref="CollaborationActorMismatchException">The payload named another tenant.</exception>
    /// <exception cref="CollaborationResourceNotFoundException">Absent, or the caller is not a party.</exception>
    /// <exception cref="CollaborationAccessDeniedException">Party, but without an active grant.</exception>
    Task<CollaborationAgreement> EnsureCapabilityAsync(
        Guid agreementId,
        Guid claimedActorTenantId,
        string capability,
        CancellationToken cancellationToken = default);
}
