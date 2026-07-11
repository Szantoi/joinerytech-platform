using FluentValidation;
using SpaceOS.Modules.DMS.Application.Commands;

namespace SpaceOS.Modules.DMS.Application.Validators;

/// <summary>
/// Validator for UpdateDocumentCategoryCommand.
/// </summary>
public class UpdateDocumentCategoryCommandValidator
    : AbstractValidator<UpdateDocumentCategoryCommand>
{
    public UpdateDocumentCategoryCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Category Id is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Name is required")
            .MaximumLength(100)
            .WithMessage("Name must not exceed 100 characters");

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .WithMessage("Description must not exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Description));
    }
}
