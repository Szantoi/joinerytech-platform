using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Projections;

/// <summary>
/// Projection service building actor-filtered read models for B2B collaboration (B2B-07).
/// Ensures strict tenant isolation and prevents existence or timing leakages for unauthorized actors.
/// </summary>
public class CollaborationProjectionService(IAgreementViewQueries? viewQueries = null)
{
    /// <summary>
    /// Builds the agreement view for one party (B2B-10 F3/4).
    /// </summary>
    /// <remarks>
    /// <para>
    /// F1 deliberately did NOT return this from a command: two of its fields — the terms hash and
    /// the open-package count — come from outside the aggregate, and a half-filled projection is
    /// worse than a smaller answer because the caller cannot tell which parts are real. They are
    /// fetched here, so every field is either true or explicitly absent.
    /// </para>
    /// <para>
    /// A tenant that is not a party gets <c>null</c> — the same "no such thing" the guard already
    /// produces, kept identical so that neither layer can become the more talkative one.
    /// </para>
    /// </remarks>
    public async Task<AgreementReadModel?> ProjectAgreementAsync(
        CollaborationAgreement? agreement,
        Guid requestingTenantId,
        CancellationToken cancellationToken = default)
    {
        if (agreement is null
            || (requestingTenantId != agreement.HostTenantId && requestingTenantId != agreement.GuestTenantId))
        {
            return null;
        }

        if (viewQueries is null)
        {
            throw new InvalidOperationException(
                "The agreement view needs IAgreementViewQueries; the projection was composed without it.");
        }

        var termsHash = agreement.CurrentTermsRevisionId is { } revisionId
            ? await viewQueries.GetTermsHashAsync(revisionId, cancellationToken)
            : null;

        var openPackages = await viewQueries.CountOpenWorkPackagesAsync(agreement.Id, cancellationToken);

        return new AgreementReadModel(
            agreement.Id,
            agreement.HostTenantId,
            agreement.GuestTenantId,
            agreement.Title,
            agreement.Status.ToString(),
            termsHash,
            openPackages,
            agreement.RowVersion,
            agreement.AllowedActionsFor(requestingTenantId).ToList(),
            agreement.CreatedAtUtc,
            agreement.LastChangedAtUtc);
    }

    public WorkPackageReadModel? ProjectWorkPackage(DelegatedWorkPackage? workPackage, Guid requestingTenantId)
    {
        if (workPackage == null)
            return null;

        if (requestingTenantId != workPackage.HostTenantId && requestingTenantId != workPackage.GuestTenantId)
        {
            // Attacker or uninvited tenant gets null (404 Not Found response)
            return null;
        }

        // The aggregate answers this since F3/4. The projection used to compute it from a table
        // of its own, and that table had drifted: it withheld Cancel from the guest in Draft — an
        // action the domain allows — so a portal built from this list would have hidden a legal
        // move. A read model may reshape what the domain says; it may not decide it.
        var allowedActions = workPackage.AllowedActionsFor(requestingTenantId).ToList();

        var historyDtos = workPackage.History.Select(h => new WorkPackageHistoryDto(
            h.Id,
            h.FromStatus,
            h.ToStatus,
            h.ActorTenantId,
            h.ActorUserId,
            h.ActionName,
            h.Reason,
            h.TimestampUtc
        )).ToList();

        return new WorkPackageReadModel(
            workPackage.Id,
            workPackage.AgreementId,
            workPackage.HostTenantId,
            workPackage.GuestTenantId,
            workPackage.Title,
            workPackage.ScopeDescription,
            workPackage.Status,
            workPackage.DueAtUtc,
            workPackage.RowVersion,
            workPackage.DeliverableRef,
            workPackage.CompletionProofRef,
            workPackage.RejectionOrChangeReason,
            allowedActions,
            historyDtos,
            workPackage.CreatedAtUtc,
            workPackage.WorkScope is { } scope
                ? new WorkScopeDto(scope.ProjectId, scope.EpicId, scope.TaskId)
                : null
        );
    }
}
