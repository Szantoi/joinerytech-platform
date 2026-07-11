using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for DeactivateQACheckpointCommand.
/// </summary>
public class DeactivateQACheckpointValidator : AbstractValidator<DeactivateQACheckpointCommand>
{
    public DeactivateQACheckpointValidator()
    {
        RuleFor(x => x.CheckpointId)
            .NotNull().WithMessage("Checkpoint ID is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
