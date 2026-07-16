using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for CompleteInspectionWithConditionalCommand (ADR-063).
/// Mirrors the Fail validator: the minor defects must be documented — they feed
/// the auto-spawned rework Ticket.
/// </summary>
public class CompleteInspectionWithConditionalValidator : AbstractValidator<CompleteInspectionWithConditionalCommand>
{
    public CompleteInspectionWithConditionalValidator()
    {
        RuleFor(x => x.InspectionId)
            .NotNull().WithMessage("Inspection ID is required");

        RuleFor(x => x.FailureNotes)
            .NotEmpty().WithMessage("At least one failure note is required when inspection passes conditionally");

        RuleForEach(x => x.FailureNotes).ChildRules(note =>
        {
            note.RuleFor(fn => fn.FailureType)
                .IsInEnum().WithMessage("Valid failure type is required");

            note.RuleFor(fn => fn.Description)
                .NotEmpty().WithMessage("Failure note description is required")
                .MinimumLength(10).WithMessage("Failure note description must be at least 10 characters");
        });

        RuleFor(x => x.ReworkTicketPriority)
            .IsInEnum().WithMessage("Valid rework ticket priority is required");

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
