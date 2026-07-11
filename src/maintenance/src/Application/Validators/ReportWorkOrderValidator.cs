using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for ReportWorkOrderCommand.
/// </summary>
public class ReportWorkOrderValidator : AbstractValidator<ReportWorkOrderCommand>
{
    public ReportWorkOrderValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Work order title is required")
            .Length(1, 200).WithMessage("Work order title must be between 1 and 200 characters");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Work order description is required")
            .Length(1, 2000).WithMessage("Work order description must be between 1 and 2000 characters");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Invalid work order type");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("Invalid work order priority");
    }
}
