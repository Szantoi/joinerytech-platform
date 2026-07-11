using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for AddWorkOrderPartCommand.
/// </summary>
public class AddWorkOrderPartValidator : AbstractValidator<AddWorkOrderPartCommand>
{
    public AddWorkOrderPartValidator()
    {
        RuleFor(x => x.PartName)
            .NotEmpty().WithMessage("Part name is required")
            .Length(1, 200).WithMessage("Part name must be between 1 and 200 characters");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be positive");

        RuleFor(x => x.UnitPrice)
            .GreaterThan(0).WithMessage("Unit price must be positive");
    }
}
