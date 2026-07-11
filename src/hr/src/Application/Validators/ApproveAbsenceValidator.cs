using FluentValidation;
using SpaceOS.Modules.HR.Application.Commands;

namespace SpaceOS.Modules.HR.Application.Validators;

/// <summary>
/// Validator for ApproveAbsenceCommand.
/// </summary>
public class ApproveAbsenceValidator : AbstractValidator<ApproveAbsenceCommand>
{
    public ApproveAbsenceValidator()
    {
        RuleFor(x => x.AbsenceId)
            .NotNull().WithMessage("Absence ID is required");

        RuleFor(x => x.ApprovedByUserId)
            .NotEmpty().WithMessage("Approver user ID is required");
    }
}
