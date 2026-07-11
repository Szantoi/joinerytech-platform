namespace SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

/// <summary>
/// Corrective action to prevent recurrence (0-n per Incident)
/// Owned entity - cannot exist independently
/// </summary>
public class CorrectiveAction
{
    public Guid CorrectiveActionId { get; private set; }
    public Guid IncidentId { get; private set; }  // FK to parent Incident
    public string Description { get; private set; } = string.Empty;
    public Guid AssignedTo { get; private set; }
    public DateTimeOffset DueDate { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public bool IsCompleted => CompletedAt.HasValue;

    private CorrectiveAction() { }  // EF Core

    internal CorrectiveAction(
        Guid incidentId,
        string description,
        Guid assignedTo,
        DateTimeOffset dueDate)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required", nameof(description));

        if (assignedTo == Guid.Empty)
            throw new ArgumentException("AssignedTo is required", nameof(assignedTo));

        if (dueDate < DateTimeOffset.UtcNow)
            throw new ArgumentException("DueDate cannot be in the past", nameof(dueDate));

        CorrectiveActionId = Guid.NewGuid();
        IncidentId = incidentId;
        Description = description;
        AssignedTo = assignedTo;
        DueDate = dueDate;
    }

    internal void MarkCompleted()
    {
        if (IsCompleted)
            throw new InvalidOperationException("Corrective action already completed");

        CompletedAt = DateTimeOffset.UtcNow;
    }
}
