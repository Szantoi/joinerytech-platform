using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for RejectWorkOrderCommand.
/// </summary>
public class RejectWorkOrderValidator : AbstractValidator<RejectWorkOrderCommand>
{
    public RejectWorkOrderValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Rejection reason is required")
            .Length(1, 500).WithMessage("Rejection reason must be between 1 and 500 characters");
    }
}
