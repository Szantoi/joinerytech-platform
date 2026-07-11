using FluentValidation;
using SpaceOS.Modules.DMS.Application.Commands;

namespace SpaceOS.Modules.DMS.Application.Validators;

/// <summary>
/// Validator for UploadVersionCommand.
/// </summary>
public class UploadVersionValidator : AbstractValidator<UploadVersionCommand>
{
    public UploadVersionValidator()
    {
        RuleFor(x => x.DocumentId)
            .NotEmpty().WithMessage("Document ID is required");

        RuleFor(x => x.UploadedByUserId)
            .NotEmpty().WithMessage("Uploader user ID is required");

        RuleFor(x => x.ChangeNotes)
            .MaximumLength(500).WithMessage("Version comment cannot exceed 500 characters");

        RuleFor(x => x.FileStream)
            .NotNull().WithMessage("File stream is required");
    }
}
