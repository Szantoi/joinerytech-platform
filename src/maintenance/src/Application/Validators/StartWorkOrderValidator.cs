using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for StartWorkOrderCommand.
/// No special validation (RequiresDowntime is bool).
/// </summary>
public class StartWorkOrderValidator : AbstractValidator<StartWorkOrderCommand>
{
    public StartWorkOrderValidator()
    {
        // No special validation required
    }
}
