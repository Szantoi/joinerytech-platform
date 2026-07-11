namespace SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

/// <summary>
/// Incident witness information (0-n per Incident)
/// Owned entity - cannot exist independently
/// </summary>
public class IncidentWitness
{
    public Guid IncidentWitnessId { get; private set; }
    public Guid IncidentId { get; private set; }  // FK to parent Incident
    public Guid EmployeeId { get; private set; }  // FK to HR module
    public string Statement { get; private set; } = string.Empty;
    public DateTimeOffset RecordedAt { get; private set; }

    private IncidentWitness() { }  // EF Core

    internal IncidentWitness(
        Guid incidentId,
        Guid employeeId,
        string statement)
    {
        if (employeeId == Guid.Empty)
            throw new ArgumentException("EmployeeId is required", nameof(employeeId));

        if (string.IsNullOrWhiteSpace(statement))
            throw new ArgumentException("Statement is required", nameof(statement));

        IncidentWitnessId = Guid.NewGuid();
        IncidentId = incidentId;
        EmployeeId = employeeId;
        Statement = statement;
        RecordedAt = DateTimeOffset.UtcNow;
    }
}
