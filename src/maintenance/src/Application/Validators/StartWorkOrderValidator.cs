using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for StartWorkOrderCommand.
/// No payload to validate — start carries no body (portal contract:
/// RequiresDowntime is fixed at creation time on the aggregate).
/// </summary>
public class StartWorkOrderValidator : AbstractValidator<StartWorkOrderCommand>
{
    public StartWorkOrderValidator()
    {
        // No special validation required
    }
}
