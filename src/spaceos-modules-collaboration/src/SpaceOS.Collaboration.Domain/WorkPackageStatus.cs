namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// States for DelegatedWorkPackage lifecycle FSM (B2B-04).
/// </summary>
public enum WorkPackageStatus
{
    Draft = 0,
    Offered = 1,
    Accepted = 2,
    InProgress = 3,
    Submitted = 4,
    Completed = 5,
    Rejected = 6,
    Cancelled = 7,
    ChangesRequested = 8,
    Disputed = 9
}
