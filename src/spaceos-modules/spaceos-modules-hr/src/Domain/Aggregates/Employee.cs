using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.HR.Domain.Aggregates;

/// <summary>
/// Employee aggregate root.
/// Represents a company employee with personal info, employment details, and competencies.
/// </summary>
public class Employee : AggregateRoot
{
    private readonly List<EmployeeCompetency> _competencies = new();

    /// <summary>
    /// Employee unique identifier.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Employee's full name.
    /// </summary>
    public string FullName { get; private set; } = string.Empty;

    /// <summary>
    /// Employee email address.
    /// </summary>
    public string Email { get; private set; } = string.Empty;

    /// <summary>
    /// Employment start date.
    /// </summary>
    public DateTime HireDate { get; private set; }

    /// <summary>
    /// Current employment status.
    /// </summary>
    public EmploymentStatus Status { get; private set; }

    /// <summary>
    /// Department assignment.
    /// </summary>
    public string Department { get; private set; } = string.Empty;

    /// <summary>
    /// Job title/position.
    /// </summary>
    public string JobTitle { get; private set; } = string.Empty;

    /// <summary>
    /// Employee's training certifications and competencies.
    /// </summary>
    public IReadOnlyCollection<EmployeeCompetency> Competencies => _competencies.AsReadOnly();

    /// <summary>
    /// Tenant ID for multi-tenancy.
    /// </summary>
    public Guid TenantId { get; private set; }

    // EF Core constructor
    private Employee() { }

    /// <summary>
    /// Creates a new employee.
    /// </summary>
    public Employee(
        Guid id,
        Guid tenantId,
        string fullName,
        string email,
        DateTime hireDate,
        string department,
        string jobTitle)
    {
        Id = id;
        TenantId = tenantId;
        FullName = fullName ?? throw new ArgumentNullException(nameof(fullName));
        Email = email ?? throw new ArgumentNullException(nameof(email));
        HireDate = hireDate;
        Department = department ?? throw new ArgumentNullException(nameof(department));
        JobTitle = jobTitle ?? throw new ArgumentNullException(nameof(jobTitle));
        Status = EmploymentStatus.Active;
    }

    /// <summary>
    /// Adds a competency to the employee's record (e.g., from training completion).
    /// </summary>
    public void AddCompetency(
        Guid competencyId,
        string competencyName,
        string level,
        DateTime validFrom,
        DateTime? validUntil)
    {
        // Check if competency already exists
        var existing = _competencies.FirstOrDefault(c => c.CompetencyId == competencyId);
        if (existing != null)
        {
            // Update existing competency
            _competencies.Remove(existing);
        }

        var competency = new EmployeeCompetency(
            id: Guid.NewGuid(),
            employeeId: Id,
            competencyId: competencyId,
            competencyName: competencyName,
            level: level,
            validFrom: validFrom,
            validUntil: validUntil
        );

        _competencies.Add(competency);

        AddDomainEvent(new EmployeeCompetencyAddedEvent(Id, competencyId, competencyName));
    }

    /// <summary>
    /// Updates employee's job details.
    /// </summary>
    public void UpdateJobDetails(string department, string jobTitle)
    {
        Department = department ?? throw new ArgumentNullException(nameof(department));
        JobTitle = jobTitle ?? throw new ArgumentNullException(nameof(jobTitle));
    }

    /// <summary>
    /// Terminates employee.
    /// </summary>
    public void Terminate(DateTime terminationDate)
    {
        Status = EmploymentStatus.Terminated;
        AddDomainEvent(new EmployeeTerminatedEvent(Id, terminationDate));
    }
}

/// <summary>
/// Employment status enumeration.
/// </summary>
public enum EmploymentStatus
{
    Active,
    OnLeave,
    Terminated
}

/// <summary>
/// Employee competency owned entity.
/// Represents a training certification or skill.
/// </summary>
public class EmployeeCompetency
{
    public Guid Id { get; private set; }
    public Guid EmployeeId { get; private set; }
    public Guid CompetencyId { get; private set; }
    public string CompetencyName { get; private set; } = string.Empty;
    public string Level { get; private set; } = string.Empty;
    public DateTime ValidFrom { get; private set; }
    public DateTime? ValidUntil { get; private set; }

    // EF Core constructor
    private EmployeeCompetency() { }

    public EmployeeCompetency(
        Guid id,
        Guid employeeId,
        Guid competencyId,
        string competencyName,
        string level,
        DateTime validFrom,
        DateTime? validUntil)
    {
        Id = id;
        EmployeeId = employeeId;
        CompetencyId = competencyId;
        CompetencyName = competencyName ?? throw new ArgumentNullException(nameof(competencyName));
        Level = level ?? throw new ArgumentNullException(nameof(level));
        ValidFrom = validFrom;
        ValidUntil = validUntil;
    }

    /// <summary>
    /// Checks if the competency is currently valid.
    /// </summary>
    public bool IsValid(DateTime atDate)
    {
        return atDate >= ValidFrom && (!ValidUntil.HasValue || atDate <= ValidUntil.Value);
    }
}

/// <summary>
/// Domain event: Employee competency added.
/// </summary>
public sealed record EmployeeCompetencyAddedEvent(
    Guid EmployeeId,
    Guid CompetencyId,
    string CompetencyName
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Domain event: Employee terminated.
/// </summary>
public sealed record EmployeeTerminatedEvent(
    Guid EmployeeId,
    DateTime TerminationDate
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
