using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to update employee skills.
/// Note: Domain only supports skill modifications, not role/department updates.
/// </summary>
public class UpdateEmployeeSkillsCommand : IRequest<Result>
{
    public required EmployeeId EmployeeId { get; init; }
    
    /// <summary>
    /// Skills to add/update. Key = SkillKey, Value = SkillLevel
    /// </summary>
    public Dictionary<SkillKey, SkillLevel> SkillsToUpdate { get; init; } = new();
    
    /// <summary>
    /// Skills to remove.
    /// </summary>
    public List<SkillKey> SkillsToRemove { get; init; } = new();
}
