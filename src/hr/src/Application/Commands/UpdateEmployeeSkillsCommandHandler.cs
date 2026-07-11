using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for UpdateEmployeeSkillsCommand.
/// </summary>
public class UpdateEmployeeSkillsCommandHandler : IRequestHandler<UpdateEmployeeSkillsCommand, Result>
{
    private readonly IEmployeeRepository _employeeRepository;

    public UpdateEmployeeSkillsCommandHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result> Handle(UpdateEmployeeSkillsCommand request, CancellationToken ct)
    {
        try
        {
            var employee = await _employeeRepository
                .GetByIdAsync(request.EmployeeId, ct)
                .ConfigureAwait(false);

            if (employee == null)
            {
                return Result.NotFound($"Employee with ID '{request.EmployeeId}' not found");
            }

            // Remove skills first
            foreach (var skillKey in request.SkillsToRemove)
            {
                try
                {
                    employee.RemoveSkill(skillKey);
                }
                catch (ArgumentException)
                {
                    // Skill doesn't exist - ignore
                }
            }

            // Add or update skills
            foreach (var skillPair in request.SkillsToUpdate)
            {
                if (employee.Skills.Any(s => s.Key == skillPair.Key))
                {
                    // Update existing skill
                    employee.UpdateSkill(skillPair.Key, skillPair.Value);
                }
                else
                {
                    // Add new skill
                    employee.AddSkill(skillPair.Key, skillPair.Value);
                }
            }

            // Persist changes
            await _employeeRepository.UpdateAsync(employee, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (ArgumentException ex)
        {
            return Result.Error(ex.Message);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to update employee skills: {ex.Message}");
        }
    }
}
