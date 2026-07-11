using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for ReopenWorkOrderCommand.
/// </summary>
public class ReopenWorkOrderValidator : AbstractValidator<ReopenWorkOrderCommand>
{
    public ReopenWorkOrderValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Reopen reason is required")
            .Length(1, 500).WithMessage("Reopen reason must be between 1 and 500 characters");
    }
}
