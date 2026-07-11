using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for StartInspectionCommand.
/// </summary>
public class StartInspectionValidator : AbstractValidator<StartInspectionCommand>
{
    public StartInspectionValidator()
    {
        RuleFor(x => x.InspectionId)
            .NotNull().WithMessage("Inspection ID is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
