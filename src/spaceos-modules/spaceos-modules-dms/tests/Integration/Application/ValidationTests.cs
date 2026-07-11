using FluentValidation.TestHelper;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.Validators;
using SpaceOS.Modules.DMS.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Integration.Application;

/// <summary>
/// Validation tests for DMS Application Layer validators (Week 2).
/// Tests FluentValidation rules for commands.
/// </summary>
public class ValidationTests
{
    [Fact]
    public void CreateDocument_EmptyFileName_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "",
            Title = "Valid Title Here",
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.FileName);
    }

    [Fact]
    public void CreateDocument_FileNameTooLong_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = new string('x', 256),
            Title = "Valid Title",
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.FileName);
    }

    [Fact]
    public void CreateDocument_TitleTooShort_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "file.pdf",
            Title = "ab",
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void CreateDocument_TitleTooLong_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "file.pdf",
            Title = new string('x', 201),
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void CreateDocument_FileSizeZero_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "file.pdf",
            Title = "Valid Title",
            ContentType = "application/pdf",
            FileSizeBytes = 0,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.FileSizeBytes);
    }

    [Fact]
    public void CreateDocument_FileSizeTooLarge_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "file.pdf",
            Title = "Valid Title",
            ContentType = "application/pdf",
            FileSizeBytes = 101 * 1024 * 1024,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.FileSizeBytes);
    }

    [Fact]
    public void CreateDocument_TooManyTags_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "file.pdf",
            Title = "Valid Title",
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            Tags = Enumerable.Range(1, 11).Select(i => $"tag{i}").ToArray(),
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public void CreateDocument_TagTooLong_ValidationError()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "file.pdf",
            Title = "Valid Title",
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            Tags = new[] { new string('x', 51) },
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream()
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public void CreateDocument_ValidCommand_NoValidationErrors()
    {
        var validator = new CreateDocumentValidator();
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(Guid.NewGuid()),
            FolderId = FolderId.From(Guid.NewGuid()),
            FileName = "contract.pdf",
            Title = "Sales Contract Q2 2026",
            Description = "Quarterly sales agreement",
            Tags = new[] { "contract" },
            ContentType = "application/pdf",
            FileSizeBytes = 1024 * 1024,
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            FileStream = new MemoryStream(new byte[100])
        };
        var result = validator.TestValidate(command);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UploadVersion_EmptyChangeNotes_NoValidationError()
    {
        var validator = new UploadVersionValidator();
        var command = new UploadVersionCommand
        {
            DocumentId = DocumentId.From(Guid.NewGuid()),
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            ChangeNotes = "",
            FileStream = new MemoryStream(new byte[100])
        };
        var result = validator.TestValidate(command);
        result.ShouldNotHaveValidationErrorFor(x => x.ChangeNotes);
    }

    [Fact]
    public void UploadVersion_ChangeNotesTooLong_ValidationError()
    {
        var validator = new UploadVersionValidator();
        var command = new UploadVersionCommand
        {
            DocumentId = DocumentId.From(Guid.NewGuid()),
            UploadedByUserId = UserId.From(Guid.NewGuid()),
            ChangeNotes = new string('x', 1001),
            FileStream = new MemoryStream(new byte[100])
        };
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.ChangeNotes);
    }

    [Fact]
    public void UpdateMetadata_TitleTooShort_ValidationError()
    {
        var validator = new UpdateMetadataValidator();
        var command = new UpdateMetadataCommand(
            DocumentId.From(Guid.NewGuid()),
            "ab",
            "Description",
            Array.Empty<string>()
        );
        var result = validator.TestValidate(command);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }
}
