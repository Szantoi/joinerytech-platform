using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for PostponeWorkOrderCommand.
/// </summary>
public class PostponeWorkOrderValidator : AbstractValidator<PostponeWorkOrderCommand>
{
    public PostponeWorkOrderValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Postponement reason is required")
            .Length(1, 500).WithMessage("Postponement reason must be between 1 and 500 characters");
    }
}
