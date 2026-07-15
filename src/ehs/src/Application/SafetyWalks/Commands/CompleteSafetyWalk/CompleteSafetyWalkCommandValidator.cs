using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CompleteSafetyWalk;

/// <summary>
/// Validator for CompleteSafetyWalkCommand
/// </summary>
public class CompleteSafetyWalkCommandValidator : AbstractValidator<CompleteSafetyWalkCommand>
{
    public CompleteSafetyWalkCommandValidator()
    {
        RuleFor(x => x.SafetyWalkId)
            .NotEmpty()
            .WithMessage("SafetyWalkId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
