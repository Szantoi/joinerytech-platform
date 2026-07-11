using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for RemoveWorkOrderPartCommand.
/// </summary>
public class RemoveWorkOrderPartValidator : AbstractValidator<RemoveWorkOrderPartCommand>
{
    public RemoveWorkOrderPartValidator()
    {
        RuleFor(x => x.PartIndex)
            .GreaterThanOrEqualTo(0).WithMessage("Part index must be non-negative");
    }
}
