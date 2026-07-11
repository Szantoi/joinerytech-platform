using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for ScheduleWorkOrderCommand.
/// </summary>
public class ScheduleWorkOrderValidator : AbstractValidator<ScheduleWorkOrderCommand>
{
    public ScheduleWorkOrderValidator()
    {
        RuleFor(x => x.ScheduledStart)
            .GreaterThanOrEqualTo(DateTime.Today)
            .WithMessage("Scheduled start cannot be in the past");

        RuleFor(x => x.EstimatedHours)
            .GreaterThan(0).WithMessage("Estimated hours must be positive");
    }
}
