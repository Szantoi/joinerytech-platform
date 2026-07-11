using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for AddInspectionFailureNoteCommand.
/// </summary>
public class AddInspectionFailureNoteValidator : AbstractValidator<AddInspectionFailureNoteCommand>
{
    public AddInspectionFailureNoteValidator()
    {
        RuleFor(x => x.InspectionId)
            .NotNull().WithMessage("Inspection ID is required");

        RuleFor(x => x.FailureType)
            .IsInEnum().WithMessage("Valid failure type is required");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required")
            .MinimumLength(10).WithMessage("Description must be at least 10 characters");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
