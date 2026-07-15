using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.AddSafetyWalkFinding;

/// <summary>
/// Validator for AddSafetyWalkFindingCommand
/// </summary>
public class AddSafetyWalkFindingCommandValidator : AbstractValidator<AddSafetyWalkFindingCommand>
{
    public AddSafetyWalkFindingCommandValidator()
    {
        RuleFor(x => x.SafetyWalkId)
            .NotEmpty()
            .WithMessage("SafetyWalkId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Description)
            .NotEmpty()
            .MaximumLength(2000)
            .WithMessage("Description is required and must be max 2000 characters");

        RuleFor(x => x.Severity)
            .IsInEnum()
            .WithMessage("Invalid severity level");

        // CAPA data must come as a pair
        RuleFor(x => x.CapaDueDate)
            .NotNull()
            .When(x => x.CapaAssignedTo.HasValue)
            .WithMessage("CapaDueDate is required when CapaAssignedTo is provided");

        RuleFor(x => x.CapaAssignedTo)
            .NotNull()
            .When(x => x.CapaDueDate.HasValue)
            .WithMessage("CapaAssignedTo is required when CapaDueDate is provided");

        // A CAPA only makes sense on findings that require action
        RuleFor(x => x.RequiresAction)
            .Equal(true)
            .When(x => x.CapaAssignedTo.HasValue || x.CapaDueDate.HasValue)
            .WithMessage("CAPA can only be created for findings that require action");
    }
}
