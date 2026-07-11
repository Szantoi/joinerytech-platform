namespace SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

/// <summary>
/// Incident investigation details (0-1 per Incident)
/// Owned entity - cannot exist independently
/// </summary>
public class IncidentInvestigation
{
    public Guid IncidentInvestigationId { get; private set; }
    public Guid IncidentId { get; private set; }  // FK to parent Incident
    public string Findings { get; private set; } = string.Empty;
    public string RootCause { get; private set; } = string.Empty;
    public string? Recommendations { get; private set; }
    public Guid InvestigatedBy { get; private set; }
    public DateTimeOffset CompletedAt { get; private set; }

    private IncidentInvestigation() { }  // EF Core

    internal IncidentInvestigation(
        Guid incidentId,
        string findings,
        string rootCause,
        Guid investigatedBy,
        string? recommendations = null)
    {
        if (string.IsNullOrWhiteSpace(findings))
            throw new ArgumentException("Findings are required", nameof(findings));

        if (string.IsNullOrWhiteSpace(rootCause))
            throw new ArgumentException("Root cause is required", nameof(rootCause));

        IncidentInvestigationId = Guid.NewGuid();
        IncidentId = incidentId;
        Findings = findings;
        RootCause = rootCause;
        Recommendations = recommendations;
        InvestigatedBy = investigatedBy;
        CompletedAt = DateTimeOffset.UtcNow;
    }
}
