using FluentValidation;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.AddLeadTask;

/// <summary>
/// Validator for AddLeadTaskCommand
/// </summary>
public class AddLeadTaskValidator : AbstractValidator<AddLeadTaskCommand>
{
    public AddLeadTaskValidator()
    {
        RuleFor(x => x.LeadId)
            .NotEmpty()
            .WithMessage("LeadId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Title is required")
            .MaximumLength(200)
            .WithMessage("Title must not exceed 200 characters");

        RuleFor(x => x.DueDate)
            .GreaterThan(DateTime.UtcNow.Date)
            .WithMessage("Due date must be in the future");

        RuleFor(x => x.Priority)
            .NotEmpty()
            .WithMessage("Priority is required")
            .Must(BeValidPriority)
            .WithMessage("Invalid priority. Valid values: Low, Medium, High, Critical");

        RuleFor(x => x.CreatedBy)
            .NotEmpty()
            .WithMessage("CreatedBy is required");
    }

    private bool BeValidPriority(string priority)
    {
        return Enum.TryParse<CrmTaskPriority>(priority, ignoreCase: true, out _);
    }
}
