using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for CreateReworkInspectionCommand (ADR-063).
/// The state guard (original Completed + Conditional) lives in the aggregate;
/// this only validates the request payload shape.
/// </summary>
public class CreateReworkInspectionValidator : AbstractValidator<CreateReworkInspectionCommand>
{
    public CreateReworkInspectionValidator()
    {
        RuleFor(x => x.OriginalInspectionId)
            .NotNull().WithMessage("Original inspection ID is required");

        RuleFor(x => x.InspectorId)
            .NotEmpty().WithMessage("Inspector ID is required");

        RuleFor(x => x.PlannedAt)
            .NotEmpty().WithMessage("PlannedAt is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
