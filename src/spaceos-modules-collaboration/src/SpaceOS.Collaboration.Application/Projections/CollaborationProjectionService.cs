using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Projections;

/// <summary>
/// Projection service building actor-filtered read models for B2B collaboration (B2B-07).
/// Ensures strict tenant isolation and prevents existence or timing leakages for unauthorized actors.
/// </summary>
public class CollaborationProjectionService
{
    public WorkPackageReadModel? ProjectWorkPackage(DelegatedWorkPackage? workPackage, Guid requestingTenantId)
    {
        if (workPackage == null)
            return null;

        if (requestingTenantId != workPackage.HostTenantId && requestingTenantId != workPackage.GuestTenantId)
        {
            // Attacker or uninvited tenant gets null (404 Not Found response)
            return null;
        }

        var allowedActions = AllowedActionsPolicy.CalculateForWorkPackage(workPackage, requestingTenantId);

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
            workPackage.CreatedAtUtc
        );
    }
}
