using FluentValidation;
using SpaceOS.Modules.HR.Application.Commands;

namespace SpaceOS.Modules.HR.Application.Validators;

/// <summary>
/// Validator for RejectAbsenceCommand.
/// </summary>
public class RejectAbsenceValidator : AbstractValidator<RejectAbsenceCommand>
{
    public RejectAbsenceValidator()
    {
        RuleFor(x => x.AbsenceId)
            .NotNull().WithMessage("Absence ID is required");

        RuleFor(x => x.RejectedByUserId)
            .NotEmpty().WithMessage("Rejecter user ID is required");

        RuleFor(x => x.RejectionReason)
            .NotEmpty().WithMessage("Rejection reason is required")
            .Length(1, 500).WithMessage("Rejection reason must be between 1 and 500 characters");
    }
}
