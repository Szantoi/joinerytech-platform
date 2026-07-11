using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

/// <summary>
/// Incident aggregate root - manages workplace incident lifecycle
/// FSM: Reported → Investigated → CorrectiveActionPlanned → Closed → Reopened
/// ISO 45001 compliance
/// </summary>
public class Incident : AggregateRoot
{
    private readonly List<CorrectiveAction> _correctiveActions = new();
    private readonly List<IncidentWitness> _witnesses = new();

    public Guid IncidentId { get; private set; }
    public Guid TenantId { get; private set; }
    public IncidentType IncidentType { get; private set; }
    public DateTimeOffset IncidentDate { get; private set; }
    public string Location { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Severity Severity { get; private set; }
    public IncidentStatus Status { get; private set; }
    public Guid ReportedBy { get; private set; }
    public DateTimeOffset ReportedAt { get; private set; }
    public Guid? InvestigatedBy { get; private set; }
    public DateTimeOffset? InvestigatedAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }

    // Navigation properties
    public IncidentInvestigation? Investigation { get; private set; }
    public IReadOnlyList<CorrectiveAction> CorrectiveActions => _correctiveActions.AsReadOnly();
    public IReadOnlyList<IncidentWitness> Witnesses => _witnesses.AsReadOnly();

    private Incident() { }  // EF Core

    /// <summary>
    /// Create a new Incident in Reported status
    /// </summary>
    public static Incident Create(
        Guid tenantId,
        IncidentType incidentType,
        DateTimeOffset incidentDate,
        string location,
        string description,
        Severity severity,
        Guid reportedBy)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (string.IsNullOrWhiteSpace(location))
            throw new ArgumentException("Location is required", nameof(location));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required", nameof(description));

        if (reportedBy == Guid.Empty)
            throw new ArgumentException("ReportedBy is required", nameof(reportedBy));

        if (incidentDate > DateTimeOffset.UtcNow)
            throw new ArgumentException("IncidentDate cannot be in the future", nameof(incidentDate));

        var incident = new Incident
        {
            IncidentId = Guid.NewGuid(),
            TenantId = tenantId,
            IncidentType = incidentType,
            IncidentDate = incidentDate,
            Location = location,
            Description = description,
            Severity = severity,
            Status = IncidentStatus.Reported,
            ReportedBy = reportedBy,
            ReportedAt = DateTimeOffset.UtcNow
        };

        incident.AddDomainEvent(new IncidentReportedEvent(
            incident.IncidentId,
            incident.IncidentType,
            incident.Severity));

        return incident;
    }

    /// <summary>
    /// FSM Transition: Reported → Investigated
    /// Starts investigation and records investigator
    /// </summary>
    public void StartInvestigation(Guid investigatedBy)
    {
        if (Status != IncidentStatus.Reported)
            throw new InvalidOperationException("Can only investigate reported incidents");

        if (investigatedBy == Guid.Empty)
            throw new ArgumentException("InvestigatedBy is required", nameof(investigatedBy));

        InvestigatedBy = investigatedBy;
        InvestigatedAt = DateTimeOffset.UtcNow;
        Status = IncidentStatus.Investigated;

        AddDomainEvent(new InvestigationStartedEvent(IncidentId, investigatedBy));
    }

    /// <summary>
    /// Add investigation findings (optional but recommended)
    /// </summary>
    public void AddInvestigationFindings(
        string findings,
        string rootCause,
        string? recommendations = null)
    {
        if (Status != IncidentStatus.Investigated)
            throw new InvalidOperationException("Can only add findings to investigated incidents");

        if (Investigation != null)
            throw new InvalidOperationException("Investigation findings already added");

        if (!InvestigatedBy.HasValue)
            throw new InvalidOperationException("Investigation must be started first");

        Investigation = new IncidentInvestigation(
            IncidentId,
            findings,
            rootCause,
            InvestigatedBy.Value,
            recommendations);
    }

    /// <summary>
    /// FSM Transition: Investigated → CorrectiveActionPlanned
    /// Adds corrective action and transitions state
    /// </summary>
    public void AddCorrectiveAction(string description, Guid assignedTo, DateTimeOffset dueDate)
    {
        if (Status != IncidentStatus.Investigated)
            throw new InvalidOperationException("Corrective actions can only be added to investigated incidents");

        var action = new CorrectiveAction(IncidentId, description, assignedTo, dueDate);
        _correctiveActions.Add(action);
        Status = IncidentStatus.CorrectiveActionPlanned;

        AddDomainEvent(new CorrectiveActionPlannedEvent(IncidentId, action.CorrectiveActionId));
    }

    /// <summary>
    /// Add witness statement
    /// </summary>
    public void AddWitness(Guid employeeId, string statement)
    {
        var witness = new IncidentWitness(IncidentId, employeeId, statement);
        _witnesses.Add(witness);
    }

    /// <summary>
    /// FSM Transition: CorrectiveActionPlanned → Closed
    /// Closes the incident after corrective actions planned
    /// </summary>
    public void CloseIncident()
    {
        if (Status != IncidentStatus.CorrectiveActionPlanned)
            throw new InvalidOperationException("Can only close incidents with corrective actions planned");

        ClosedAt = DateTimeOffset.UtcNow;
        Status = IncidentStatus.Closed;

        AddDomainEvent(new IncidentClosedEvent(IncidentId));
    }

    /// <summary>
    /// FSM Transition: Closed → Reopened
    /// Reopens a closed incident for additional review
    /// </summary>
    public void ReopenIncident()
    {
        if (Status != IncidentStatus.Closed)
            throw new InvalidOperationException("Can only reopen closed incidents");

        Status = IncidentStatus.Reopened;

        AddDomainEvent(new IncidentReopenedEvent(IncidentId));
    }
}
