namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// State change audit history record for DelegatedWorkPackage (B2B-04).
/// </summary>
public class WorkPackageStateHistoryEntry
{
    public Guid Id { get; private set; }
    public Guid WorkPackageId { get; private set; }
    public WorkPackageStatus FromStatus { get; private set; }
    public WorkPackageStatus ToStatus { get; private set; }
    public Guid ActorTenantId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public string ActionName { get; private set; } = string.Empty;
    public string? Reason { get; private set; }
    public DateTimeOffset TimestampUtc { get; private set; }

    private WorkPackageStateHistoryEntry() { }

    public static WorkPackageStateHistoryEntry Record(
        Guid workPackageId,
        WorkPackageStatus fromStatus,
        WorkPackageStatus toStatus,
        Guid actorTenantId,
        Guid actorUserId,
        string actionName,
        string? reason,
        DateTimeOffset timestampUtc)
    {
        return new WorkPackageStateHistoryEntry
        {
            Id = Guid.NewGuid(),
            WorkPackageId = workPackageId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ActorTenantId = actorTenantId,
            ActorUserId = actorUserId,
            ActionName = actionName?.Trim() ?? "StateChange",
            Reason = reason?.Trim(),
            TimestampUtc = timestampUtc
        };
    }
}
