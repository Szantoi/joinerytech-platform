using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for CompleteInspectionWithFailCommand.
/// </summary>
public class CompleteInspectionWithFailValidator : AbstractValidator<CompleteInspectionWithFailCommand>
{
    public CompleteInspectionWithFailValidator()
    {
        RuleFor(x => x.InspectionId)
            .NotNull().WithMessage("Inspection ID is required");

        RuleFor(x => x.FailureNotes)
            .NotEmpty().WithMessage("At least one failure note is required when inspection fails")
            .Must(notes => notes != null && notes.Count > 0)
            .WithMessage("At least one failure note is required when inspection fails");

        RuleForEach(x => x.FailureNotes).ChildRules(note =>
        {
            note.RuleFor(fn => fn.FailureType)
                .IsInEnum().WithMessage("Valid failure type is required");

            note.RuleFor(fn => fn.Description)
                .NotEmpty().WithMessage("Failure note description is required")
                .MinimumLength(10).WithMessage("Failure note description must be at least 10 characters");
        });

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
