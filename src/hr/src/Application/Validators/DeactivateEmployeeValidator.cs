using FluentValidation;
using SpaceOS.Modules.HR.Application.Commands;

namespace SpaceOS.Modules.HR.Application.Validators;

/// <summary>
/// Validator for DeactivateEmployeeCommand.
/// </summary>
public class DeactivateEmployeeValidator : AbstractValidator<DeactivateEmployeeCommand>
{
    public DeactivateEmployeeValidator()
    {
        RuleFor(x => x.EmployeeId)
            .NotNull().WithMessage("Employee ID is required");
    }
}
