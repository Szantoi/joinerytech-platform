using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for CreateInspectionCommand.
/// </summary>
public class CreateInspectionValidator : AbstractValidator<CreateInspectionCommand>
{
    public CreateInspectionValidator()
    {
        RuleFor(x => x.CheckpointId)
            .NotNull().WithMessage("Checkpoint ID is required");

        RuleFor(x => x.InspectorId)
            .NotEmpty().WithMessage("Inspector ID is required");

        RuleFor(x => x.PlannedAt)
            .GreaterThanOrEqualTo(DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Planned date must be in the future or present (5 minute grace period)");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
