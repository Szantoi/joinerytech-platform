using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.ScheduleSafetyWalk;

/// <summary>
/// Validator for ScheduleSafetyWalkCommand
/// </summary>
public class ScheduleSafetyWalkCommandValidator : AbstractValidator<ScheduleSafetyWalkCommand>
{
    public ScheduleSafetyWalkCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.LocationId)
            .NotEmpty()
            .WithMessage("LocationId is required");

        RuleFor(x => x.ConductedBy)
            .NotEmpty()
            .WithMessage("ConductedBy is required");
    }
}
