using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for ReactivateQACheckpointCommand.
/// </summary>
public class ReactivateQACheckpointValidator : AbstractValidator<ReactivateQACheckpointCommand>
{
    public ReactivateQACheckpointValidator()
    {
        RuleFor(x => x.CheckpointId)
            .NotNull().WithMessage("Checkpoint ID is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
