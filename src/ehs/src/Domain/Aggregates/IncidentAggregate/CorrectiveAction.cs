using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

/// <summary>
/// Corrective action to prevent recurrence — the UNIFIED CAPA concept.
/// Originally owned by Incident, now a first-class entity shared by every
/// CAPA source (incident investigation, safety walk finding, risk assessment)
/// so the portal can render a single CAPA board.
/// Source/SourceId identify the spawning aggregate; IncidentId stays as the
/// relational FK for incident-sourced actions.
/// </summary>
public class CorrectiveAction
{
    public Guid CorrectiveActionId { get; private set; }

    /// <summary>Tenant owning the CAPA — required for the unified CAPA board query</summary>
    public Guid TenantId { get; private set; }

    /// <summary>Which mechanism spawned this CAPA (Incident / SafetyWalk / RiskAssessment)</summary>
    public CapaSource Source { get; private set; }

    /// <summary>Id of the spawning aggregate (IncidentId or SafetyWalkId)</summary>
    public Guid SourceId { get; private set; }

    /// <summary>FK to parent Incident — set only when Source = Incident</summary>
    public Guid? IncidentId { get; private set; }

    /// <summary>FK to the spawning safety walk finding — set only when Source = SafetyWalk</summary>
    public Guid? FindingId { get; private set; }

    public string Description { get; private set; } = string.Empty;
    public Guid AssignedTo { get; private set; }
    public DateTimeOffset DueDate { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public bool IsCompleted => CompletedAt.HasValue;

    private CorrectiveAction() { }  // EF Core

    private CorrectiveAction(
        Guid tenantId,
        CapaSource source,
        Guid sourceId,
        Guid? incidentId,
        Guid? findingId,
        string description,
        Guid assignedTo,
        DateTimeOffset dueDate)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (sourceId == Guid.Empty)
            throw new ArgumentException("SourceId is required", nameof(sourceId));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required", nameof(description));

        if (assignedTo == Guid.Empty)
            throw new ArgumentException("AssignedTo is required", nameof(assignedTo));

        if (dueDate < DateTimeOffset.UtcNow)
            throw new ArgumentException("DueDate cannot be in the past", nameof(dueDate));

        CorrectiveActionId = Guid.NewGuid();
        TenantId = tenantId;
        Source = source;
        SourceId = sourceId;
        IncidentId = incidentId;
        FindingId = findingId;
        Description = description;
        AssignedTo = assignedTo;
        DueDate = dueDate;
    }

    /// <summary>
    /// Factory for incident-sourced CAPAs — called by Incident.AddCorrectiveAction.
    /// </summary>
    internal static CorrectiveAction CreateForIncident(
        Guid tenantId,
        Guid incidentId,
        string description,
        Guid assignedTo,
        DateTimeOffset dueDate)
    {
        return new CorrectiveAction(
            tenantId,
            CapaSource.Incident,
            incidentId,
            incidentId,
            findingId: null,
            description,
            assignedTo,
            dueDate);
    }

    /// <summary>
    /// Factory for safety-walk-sourced CAPAs — spawned by a finding that requires action.
    /// </summary>
    public static CorrectiveAction CreateForSafetyWalk(
        Guid tenantId,
        Guid safetyWalkId,
        Guid findingId,
        string description,
        Guid assignedTo,
        DateTimeOffset dueDate)
    {
        if (findingId == Guid.Empty)
            throw new ArgumentException("FindingId is required", nameof(findingId));

        return new CorrectiveAction(
            tenantId,
            CapaSource.SafetyWalk,
            safetyWalkId,
            incidentId: null,
            findingId,
            description,
            assignedTo,
            dueDate);
    }

    /// <summary>
    /// Mark the CAPA completed. Guard: cannot complete twice.
    /// Public so the unified CAPA endpoint can complete actions from any source.
    /// </summary>
    public void MarkCompleted()
    {
        if (IsCompleted)
            throw new InvalidOperationException("Corrective action already completed");

        CompletedAt = DateTimeOffset.UtcNow;
    }
}
