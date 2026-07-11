using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for AssignWorkOrderCommand.
/// </summary>
public class AssignWorkOrderValidator : AbstractValidator<AssignWorkOrderCommand>
{
    public AssignWorkOrderValidator()
    {
        RuleFor(x => x.AssignedTo)
            .NotEmpty().WithMessage("Assignee ID is required");

        RuleFor(x => x.AssignmentType)
            .IsInEnum().WithMessage("Invalid assignment type");
    }
}
