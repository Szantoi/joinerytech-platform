using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Projections;

/// <summary>
/// Server-side policy projection calculating exact allowed actions per actor tenant (B2B-07).
/// Prevents client-side action guessing or hardcoding.
/// </summary>
public static class AllowedActionsPolicy
{
    public static List<string> CalculateForWorkPackage(DelegatedWorkPackage workPackage, Guid requestingTenantId)
    {
        var actions = new List<string>();

        if (requestingTenantId != workPackage.HostTenantId && requestingTenantId != workPackage.GuestTenantId)
        {
            return actions; // Uninvolved tenants get zero allowed actions
        }

        bool isHost = requestingTenantId == workPackage.HostTenantId;
        bool isGuest = requestingTenantId == workPackage.GuestTenantId;

        switch (workPackage.Status)
        {
            case WorkPackageStatus.Draft:
                if (isHost || isGuest) actions.Add("Offer");
                if (isHost) actions.Add("Cancel");
                break;

            case WorkPackageStatus.Offered:
                if (isGuest)
                {
                    actions.Add("Accept");
                    actions.Add("Reject");
                }
                if (isHost || isGuest) actions.Add("Cancel");
                break;

            case WorkPackageStatus.Accepted:
                if (isGuest) actions.Add("StartProgress");
                if (isHost || isGuest) actions.Add("Cancel");
                break;

            case WorkPackageStatus.InProgress:
                if (isGuest) actions.Add("Submit");
                if (isHost || isGuest) actions.Add("Cancel");
                break;

            case WorkPackageStatus.ChangesRequested:
                if (isGuest) actions.Add("StartProgress");
                if (isHost || isGuest) actions.Add("Cancel");
                break;

            case WorkPackageStatus.Submitted:
                if (isHost)
                {
                    actions.Add("Complete");
                    actions.Add("RequestChanges");
                }
                if (isHost || isGuest) actions.Add("Cancel");
                break;

            case WorkPackageStatus.Completed:
            case WorkPackageStatus.Rejected:
            case WorkPackageStatus.Cancelled:
                // Terminal states
                break;
        }

        return actions;
    }
}
