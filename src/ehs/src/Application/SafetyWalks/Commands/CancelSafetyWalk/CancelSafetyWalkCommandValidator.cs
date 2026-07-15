using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CancelSafetyWalk;

/// <summary>
/// Validator for CancelSafetyWalkCommand
/// </summary>
public class CancelSafetyWalkCommandValidator : AbstractValidator<CancelSafetyWalkCommand>
{
    public CancelSafetyWalkCommandValidator()
    {
        RuleFor(x => x.SafetyWalkId)
            .NotEmpty()
            .WithMessage("SafetyWalkId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
