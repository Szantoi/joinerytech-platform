using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for ReopenWorkOrderCommand.
/// No payload to validate — reopen carries no reason (portal contract:
/// empty body; the aggregate clears assignment/schedule/reasons itself).
/// </summary>
public class ReopenWorkOrderValidator : AbstractValidator<ReopenWorkOrderCommand>
{
    public ReopenWorkOrderValidator()
    {
        // No special validation required
    }
}
