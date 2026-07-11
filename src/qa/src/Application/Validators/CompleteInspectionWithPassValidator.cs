using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for CompleteInspectionWithPassCommand.
/// </summary>
public class CompleteInspectionWithPassValidator : AbstractValidator<CompleteInspectionWithPassCommand>
{
    public CompleteInspectionWithPassValidator()
    {
        RuleFor(x => x.InspectionId)
            .NotNull().WithMessage("Inspection ID is required");

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
