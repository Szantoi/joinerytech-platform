using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.CreateLocation;

/// <summary>
/// Validator for CreateLocationCommand
/// </summary>
public class CreateLocationCommandValidator : AbstractValidator<CreateLocationCommand>
{
    public CreateLocationCommandValidator()
    {
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
