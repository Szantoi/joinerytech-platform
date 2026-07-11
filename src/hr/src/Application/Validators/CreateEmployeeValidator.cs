using FluentValidation;
using SpaceOS.Modules.HR.Application.Commands;

namespace SpaceOS.Modules.HR.Application.Validators;

/// <summary>
/// Validator for CreateEmployeeCommand.
/// Business rules:
/// - Name: 2-200 characters
/// - Email: valid format
/// - PayGradeName: 1-50 characters
/// - HourlyRate: non-negative
/// - WeeklyHours: 0-168 (max hours in a week)
/// - Skills: max 20 skills
/// </summary>
public class CreateEmployeeValidator : AbstractValidator<CreateEmployeeCommand>
{
    public CreateEmployeeValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Employee name is required")
            .Length(2, 200).WithMessage("Employee name must be between 2 and 200 characters");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(100).WithMessage("Email cannot exceed 100 characters");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required")
            .MaximumLength(100).WithMessage("Role cannot exceed 100 characters");

        RuleFor(x => x.Department)
            .IsInEnum().WithMessage("Invalid department value");

        RuleFor(x => x.FacilityId)
            .NotEmpty().WithMessage("Facility ID is required");

        RuleFor(x => x.PayGradeName)
            .NotEmpty().WithMessage("Pay grade name is required")
            .Length(1, 50).WithMessage("Pay grade name must be between 1 and 50 characters");

        RuleFor(x => x.HourlyRate)
            .GreaterThanOrEqualTo(0).WithMessage("Hourly rate must be non-negative");

        RuleFor(x => x.WeeklyHours)
            .InclusiveBetween(0, 168).WithMessage("Weekly hours must be between 0 and 168");

        RuleFor(x => x.Skills)
            .Must(s => s.Count <= 20).WithMessage("Maximum 20 skills allowed");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
