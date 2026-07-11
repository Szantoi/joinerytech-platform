using FluentValidation;
using SpaceOS.Modules.HR.Application.Commands;

namespace SpaceOS.Modules.HR.Application.Validators;

/// <summary>
/// Validator for UpdateEmployeeSkillsCommand.
/// </summary>
public class UpdateEmployeeSkillsValidator : AbstractValidator<UpdateEmployeeSkillsCommand>
{
    public UpdateEmployeeSkillsValidator()
    {
        RuleFor(x => x.EmployeeId)
            .NotNull().WithMessage("Employee ID is required");

        RuleFor(x => x.SkillsToUpdate)
            .Must(s => s.Count <= 20).WithMessage("Maximum 20 skills allowed");

        RuleFor(x => x)
            .Must(cmd => cmd.SkillsToUpdate.Count > 0 || cmd.SkillsToRemove.Count > 0)
            .WithMessage("At least one skill must be added, updated, or removed");
    }
}
