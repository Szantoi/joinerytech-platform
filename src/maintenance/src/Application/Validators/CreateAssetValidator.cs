using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for CreateAssetCommand.
/// </summary>
public class CreateAssetValidator : AbstractValidator<CreateAssetCommand>
{
    public CreateAssetValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Asset code is required")
            .Length(1, 50).WithMessage("Asset code must be between 1 and 50 characters");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Asset name is required")
            .Length(1, 200).WithMessage("Asset name must be between 1 and 200 characters");

        RuleFor(x => x.Location)
            .NotEmpty().WithMessage("Asset location is required")
            .Length(1, 200).WithMessage("Asset location must be between 1 and 200 characters");

        RuleFor(x => x.Kind)
            .IsInEnum().WithMessage("Invalid asset kind");
    }
}
