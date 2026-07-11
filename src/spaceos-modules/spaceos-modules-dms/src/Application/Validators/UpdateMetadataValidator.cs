using FluentValidation;
using SpaceOS.Modules.DMS.Application.Commands;

namespace SpaceOS.Modules.DMS.Application.Validators;

/// <summary>
/// Validator for UpdateMetadataCommand.
/// </summary>
public class UpdateMetadataValidator : AbstractValidator<UpdateMetadataCommand>
{
    public UpdateMetadataValidator()
    {
        RuleFor(x => x.DocumentId)
            .NotEmpty().WithMessage("Document ID is required");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .Length(5, 200).WithMessage("Title must be between 5 and 200 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description cannot exceed 2000 characters");

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= 10).WithMessage("Maximum 10 tags allowed")
            .Must(t => t == null || t.All(tag => tag.Length <= 50)).WithMessage("Each tag must be 50 characters or less");
    }
}
