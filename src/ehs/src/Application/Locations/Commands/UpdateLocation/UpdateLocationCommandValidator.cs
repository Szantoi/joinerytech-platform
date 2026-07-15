using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.UpdateLocation;

/// <summary>
/// Validator for UpdateLocationCommand
/// </summary>
public class UpdateLocationCommandValidator : AbstractValidator<UpdateLocationCommand>
{
    public UpdateLocationCommandValidator()
    {
        RuleFor(x => x.LocationId)
            .NotEmpty()
            .WithMessage("LocationId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Code)
            .NotEmpty()
            .MaximumLength(50)
            .WithMessage("Code is required and must be max 50 characters");

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Name is required and must be max 200 characters");

        RuleFor(x => x.Kind)
            .IsInEnum()
            .WithMessage("Invalid location kind");
    }
}
