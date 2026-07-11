using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Events;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;

namespace SpaceOS.Modules.HR.Domain.Aggregates;

/// <summary>
/// Employee aggregate root.
/// Represents a company employee with skills, personal data, and pay grade.
/// </summary>
public class Employee : AggregateRoot
{
    private readonly List<Skill> _skills = new();

    public EmployeeId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Role { get; private set; } = string.Empty;
    public Department Department { get; private set; }
    public Guid FacilityId { get; private set; }
    public PayGrade PayGrade { get; private set; } = null!;
    public decimal WeeklyHours { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public int VacationBase { get; private set; } = 20; // Hungarian default
    public bool Active { get; private set; } = true;
    public string Initials { get; private set; } = string.Empty;
    public PersonalData? Personal { get; private set; }
    public IReadOnlyList<Skill> Skills => _skills.AsReadOnly();

    // EF Core constructor
    private Employee() { }

    private Employee(
        EmployeeId id,
        Guid tenantId,
        string name,
        string role,
        Department department,
        Guid facilityId,
        PayGrade payGrade,
        decimal weeklyHours,
        string email)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Employee name is required");
        if (name.Length > 200)
            throw new DomainException("Employee name must not exceed 200 characters");
        
        if (weeklyHours < 0 || weeklyHours > 168)
            throw new DomainException("Weekly hours must be between 0 and 168");

        if (string.IsNullOrWhiteSpace(email))
            throw new DomainException("Email is required");

        Id = id;
        TenantId = tenantId;
        Name = name;
        Role = role;
        Department = department;
        FacilityId = facilityId;
        PayGrade = payGrade;
        WeeklyHours = weeklyHours;
        Email = email;
        Initials = GenerateInitials(name);
        Active = true;
        VacationBase = 20;

        AddDomainEvent(new EmployeeCreatedEvent(
            Id,
            TenantId,
            Name,
            Department,
            Email));
    }

    /// <summary>
    /// Factory method to create a new employee.
    /// </summary>
    public static Employee Create(
        Guid tenantId,
        string name,
        string role,
        Department department,
        Guid facilityId,
        PayGrade payGrade,
        decimal weeklyHours,
        string email)
    {
        return new Employee(
            EmployeeId.New(),
            tenantId,
            name,
            role,
            department,
            facilityId,
            payGrade,
            weeklyHours,
            email);
    }

    /// <summary>
    /// Adds a skill to the employee.
    /// </summary>
    public void AddSkill(SkillKey key, SkillLevel level)
    {
        if (_skills.Any(s => s.Key == key))
            throw new DomainException($"Employee already has skill {key}");

        _skills.Add(new Skill(key, level));

        AddDomainEvent(new EmployeeSkillAddedEvent(
            Id,
            TenantId,
            key,
            level));
    }

    /// <summary>
    /// Updates an existing skill level.
    /// </summary>
    public void UpdateSkill(SkillKey key, SkillLevel newLevel)
    {
        var skill = _skills.FirstOrDefault(s => s.Key == key);
        if (skill == null)
            throw new DomainException($"Skill {key} not found");

        var oldLevel = skill.Level;
        _skills.Remove(skill);
        _skills.Add(new Skill(key, newLevel));

        AddDomainEvent(new EmployeeSkillUpdatedEvent(
            Id,
            TenantId,
            key,
            oldLevel,
            newLevel));
    }

    /// <summary>
    /// Removes a skill from the employee.
    /// </summary>
    public void RemoveSkill(SkillKey key)
    {
        var skill = _skills.FirstOrDefault(s => s.Key == key);
        if (skill == null)
            throw new DomainException($"Skill {key} not found");

        _skills.Remove(skill);

        AddDomainEvent(new EmployeeSkillRemovedEvent(
            Id,
            TenantId,
            key));
    }

    /// <summary>
    /// Updates personal data (sensitive information).
    /// </summary>
    public void UpdatePersonal(PersonalData personalData)
    {
        if (personalData == null)
            throw new DomainException("Personal data is required");

        Personal = personalData;

        AddDomainEvent(new EmployeePersonalDataUpdatedEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Promotes employee to a new pay grade.
    /// </summary>
    public void PromoteToPayGrade(PayGrade newGrade)
    {
        if (newGrade == null)
            throw new DomainException("New pay grade is required");

        PayGrade = newGrade;

        AddDomainEvent(new EmployeePromotedEvent(
            Id,
            TenantId,
            newGrade.Name,
            newGrade.HourlyRate));
    }

    /// <summary>
    /// Deactivates the employee (soft delete).
    /// </summary>
    public void Deactivate()
    {
        if (!Active)
            throw new DomainException("Employee is already deactivated");

        Active = false;

        AddDomainEvent(new EmployeeDeactivatedEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Reactivates a deactivated employee.
    /// </summary>
    public void Reactivate()
    {
        if (Active)
            throw new DomainException("Employee is already active");

        Active = true;

        AddDomainEvent(new EmployeeReactivatedEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Generates initials from employee name.
    /// Example: "János Kovács" → "JK", "Smith" → "S"
    /// </summary>
    private static string GenerateInitials(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return string.Empty;

        var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0)
            return string.Empty;

        if (words.Length == 1)
            return words[0].Substring(0, Math.Min(1, words[0].Length)).ToUpper();

        return string.Join("", words.Take(2).Select(w => w[0])).ToUpper();
    }
}
