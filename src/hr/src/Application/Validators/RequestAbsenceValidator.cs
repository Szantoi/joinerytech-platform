using FluentValidation;
using SpaceOS.Modules.HR.Application.Commands;

namespace SpaceOS.Modules.HR.Application.Validators;

/// <summary>
/// Validator for RequestAbsenceCommand.
/// Business rules:
/// - StartDate: must be today or future
/// - EndDate: must be >= StartDate
/// - Max absence duration: 30 days
/// - Reason: 1-500 characters
/// </summary>
public class RequestAbsenceValidator : AbstractValidator<RequestAbsenceCommand>
{
    public RequestAbsenceValidator()
    {
        RuleFor(x => x.EmployeeId)
            .NotNull().WithMessage("Employee ID is required");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Invalid absence type");

        RuleFor(x => x.StartDate)
            .GreaterThanOrEqualTo(DateTime.Today).WithMessage("Start date must be today or in the future");

        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate).WithMessage("End date must be greater than or equal to start date");

        RuleFor(x => x)
            .Must(cmd => (cmd.EndDate - cmd.StartDate).Days <= 30)
            .WithMessage("Absence duration cannot exceed 30 days");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Absence reason is required")
            .Length(1, 500).WithMessage("Absence reason must be between 1 and 500 characters");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
