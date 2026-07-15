using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.StartSafetyWalk;

/// <summary>
/// Validator for StartSafetyWalkCommand
/// </summary>
public class StartSafetyWalkCommandValidator : AbstractValidator<StartSafetyWalkCommand>
{
    public StartSafetyWalkCommandValidator()
    {
        RuleFor(x => x.SafetyWalkId)
            .NotEmpty()
            .WithMessage("SafetyWalkId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
