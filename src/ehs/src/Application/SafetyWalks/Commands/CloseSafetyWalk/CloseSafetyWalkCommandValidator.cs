using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CloseSafetyWalk;

/// <summary>
/// Validator for CloseSafetyWalkCommand
/// </summary>
public class CloseSafetyWalkCommandValidator : AbstractValidator<CloseSafetyWalkCommand>
{
    public CloseSafetyWalkCommandValidator()
    {
        RuleFor(x => x.SafetyWalkId)
            .NotEmpty()
            .WithMessage("SafetyWalkId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
