using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for RemoveMaintenancePlanCommand.
/// </summary>
public class RemoveMaintenancePlanValidator : AbstractValidator<RemoveMaintenancePlanCommand>
{
    public RemoveMaintenancePlanValidator()
    {
        RuleFor(x => x.PlanIndex)
            .GreaterThanOrEqualTo(0).WithMessage("Plan index must be non-negative");
    }
}
