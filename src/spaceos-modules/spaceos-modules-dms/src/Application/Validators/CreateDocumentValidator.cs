using FluentValidation;
using SpaceOS.Modules.DMS.Application.Commands;

namespace SpaceOS.Modules.DMS.Application.Validators;

/// <summary>
/// Validator for CreateDocumentCommand.
/// </summary>
public class CreateDocumentValidator : AbstractValidator<CreateDocumentCommand>
{
    private static readonly string[] AllowedContentTypes = new[]
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"      // .xlsx
    };

    public CreateDocumentValidator()
    {
        RuleFor(x => x.FileName)
            .NotEmpty().WithMessage("File name cannot be empty")
            .MaximumLength(255).WithMessage("File name cannot exceed 255 characters");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .Length(5, 200).WithMessage("Title must be between 5 and 200 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description cannot exceed 2000 characters");

        RuleFor(x => x.ContentType)
            .NotEmpty().WithMessage("Content type is required")
            .Must(BeValidContentType).WithMessage($"Invalid content type. Allowed: {string.Join(", ", AllowedContentTypes)}");

        RuleFor(x => x.FileSizeBytes)
            .GreaterThan(0).WithMessage("File size must be greater than 0")
            .LessThanOrEqualTo(100 * 1024 * 1024).WithMessage("File size must be less than 100 MB");

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= 10).WithMessage("Maximum 10 tags allowed")
            .Must(t => t == null || t.All(tag => tag.Length <= 50)).WithMessage("Each tag must be 50 characters or less");

        RuleFor(x => x.FileStream)
            .NotNull().WithMessage("File stream is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");

        RuleFor(x => x.FolderId)
            .NotEmpty().WithMessage("Folder ID is required");

        RuleFor(x => x.UploadedByUserId)
            .NotEmpty().WithMessage("Uploader user ID is required");
    }

    private bool BeValidContentType(string contentType)
    {
        return AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
    }
}
