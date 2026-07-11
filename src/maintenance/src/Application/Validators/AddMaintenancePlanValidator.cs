using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for AddMaintenancePlanCommand.
/// </summary>
public class AddMaintenancePlanValidator : AbstractValidator<AddMaintenancePlanCommand>
{
    public AddMaintenancePlanValidator()
    {
        RuleFor(x => x.Trigger)
            .IsInEnum().WithMessage("Invalid maintenance trigger");

        RuleFor(x => x.IntervalDays)
            .GreaterThan(0)
            .When(x => x.Trigger == MaintenanceTrigger.Interval)
            .WithMessage("Interval days must be positive when using Interval trigger");

        RuleFor(x => x.OperatingHoursThreshold)
            .GreaterThan(0)
            .When(x => x.Trigger == MaintenanceTrigger.OperatingHours)
            .WithMessage("Operating hours threshold must be positive when using OperatingHours trigger");
    }
}
