using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to create a new employee.
/// Maps to Domain: Employee.Create(tenantId, name, role, department, facilityId, payGrade, weeklyHours, email)
/// </summary>
public class CreateEmployeeCommand : IRequest<Result<EmployeeId>>
{
    public required Guid TenantId { get; init; }
    public required string Name { get; init; }
    public required string Role { get; init; }
    public required Department Department { get; init; }
    public required Guid FacilityId { get; init; }
    public required string PayGradeName { get; init; }
    public required decimal HourlyRate { get; init; }
    public required decimal WeeklyHours { get; init; }
    public required string Email { get; init; }

    /// <summary>
    /// Skills to add after employee creation.
    /// Format: Dictionary where Key = SkillKey enum, Value = SkillLevel enum
    /// </summary>
    public Dictionary<SkillKey, SkillLevel> Skills { get; init; } = new();
}
