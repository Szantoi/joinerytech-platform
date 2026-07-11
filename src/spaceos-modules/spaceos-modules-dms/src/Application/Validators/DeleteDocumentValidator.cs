using FluentValidation;
using SpaceOS.Modules.DMS.Application.Commands;

namespace SpaceOS.Modules.DMS.Application.Validators;

/// <summary>
/// Validator for DeleteDocumentCommand.
/// </summary>
public class DeleteDocumentValidator : AbstractValidator<DeleteDocumentCommand>
{
    public DeleteDocumentValidator()
    {
        RuleFor(x => x.DocumentId)
            .NotEmpty().WithMessage("Document ID is required");
    }
}
