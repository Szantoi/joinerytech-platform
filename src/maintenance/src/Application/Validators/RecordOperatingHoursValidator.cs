using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for RecordOperatingHoursCommand.
/// </summary>
public class RecordOperatingHoursValidator : AbstractValidator<RecordOperatingHoursCommand>
{
    public RecordOperatingHoursValidator()
    {
        RuleFor(x => x.Hours)
            .GreaterThan(0).WithMessage("Operating hours must be positive");
    }
}
