using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for RetireAssetCommand.
/// </summary>
public class RetireAssetValidator : AbstractValidator<RetireAssetCommand>
{
    public RetireAssetValidator()
    {
        RuleFor(x => x.Reason)
            .MaximumLength(500).WithMessage("Retirement reason must not exceed 500 characters");
    }
}
