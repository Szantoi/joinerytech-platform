using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for UpdateQACheckpointCommand.
/// </summary>
public class UpdateQACheckpointValidator : AbstractValidator<UpdateQACheckpointCommand>
{
    public UpdateQACheckpointValidator()
    {
        RuleFor(x => x.CheckpointId)
            .NotNull().WithMessage("Checkpoint ID is required");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Checkpoint name is required")
            .Length(3, 100).WithMessage("Checkpoint name must be between 3 and 100 characters");

        RuleFor(x => x.CriticalLevel)
            .IsInEnum().WithMessage("Valid critical level is required");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Description));

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
