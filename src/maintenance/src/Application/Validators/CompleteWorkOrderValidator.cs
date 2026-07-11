using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for CompleteWorkOrderCommand.
/// </summary>
public class CompleteWorkOrderValidator : AbstractValidator<CompleteWorkOrderCommand>
{
    public CompleteWorkOrderValidator()
    {
        RuleFor(x => x.ActualHours)
            .GreaterThan(0).WithMessage("Actual hours must be positive");

        RuleFor(x => x.CompletionNote)
            .MaximumLength(1000).WithMessage("Completion note must not exceed 1000 characters");
    }
}
