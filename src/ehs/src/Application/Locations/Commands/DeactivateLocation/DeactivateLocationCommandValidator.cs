using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.DeactivateLocation;

/// <summary>
/// Validator for DeactivateLocationCommand
/// </summary>
public class DeactivateLocationCommandValidator : AbstractValidator<DeactivateLocationCommand>
{
    public DeactivateLocationCommandValidator()
    {
        RuleFor(x => x.LocationId)
            .NotEmpty()
            .WithMessage("LocationId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
