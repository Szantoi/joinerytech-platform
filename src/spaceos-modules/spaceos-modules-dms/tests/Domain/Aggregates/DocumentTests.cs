using FluentAssertions;
using SpaceOS.Modules.DMS.Domain.Aggregates;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.StrongIds;
using SpaceOS.Modules.DMS.Tests.Domain.Mocks;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Domain.Aggregates;

public class DocumentTests
{
    private readonly TenantId _tenantId = TenantId.New();
    private readonly UserId _userId = UserId.New();
    private readonly MockBlobStorageService _blobStorage = new();

    private static Stream CreateTestFileStream(string content = "Test file content")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        return new MemoryStream(bytes);
    }

    [Fact]
    public async Task CanCreateDocument()
    {
        // Arrange
        var fileStream = CreateTestFileStream();

        // Act
        var document = await Document.CreateAsync(
            _tenantId,
            "contract.pdf",
            "application/pdf",
            _userId,
            fileStream,
            _blobStorage,
            "Test contract",
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)));

        // Assert
        document.Should().NotBeNull();
        document.FileName.Should().Be("contract.pdf");
        document.MimeType.Should().Be("application/pdf");
        document.Status.Should().Be(DocumentStatus.Active);
        document.UploadedByUserId.Should().Be(_userId);
        document.Description.Should().Be("Test contract");
        document.Versions.Should().HaveCount(1);
        document.CurrentVersionNumber.Should().Be(1);
    }

    [Fact]
    public async Task CreateDocument_EmptyFileName_ThrowsException()
    {
        // Arrange
        var fileStream = CreateTestFileStream();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await Document.CreateAsync(_tenantId, "", "application/pdf", _userId, fileStream, _blobStorage));
    }

    [Fact]
    public async Task CanAddVersion()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act
        var newFileStream = CreateTestFileStream("Updated content");
        var version = await document.AddVersionAsync(newFileStream, _blobStorage, _userId, "Fixed typo");

        // Assert
        document.Versions.Should().HaveCount(2);
        document.CurrentVersionNumber.Should().Be(2);
        version.VersionNumber.Should().Be(2);
        version.ChangeNotes.Should().Be("Fixed typo");
    }

    [Fact]
    public async Task CannotAddVersionToNonActiveDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.Archive();

        // Act & Assert
        var newFileStream = CreateTestFileStream();
        await Assert.ThrowsAsync<DomainException>(async () =>
            await document.AddVersionAsync(newFileStream, _blobStorage, _userId));
    }

    [Fact]
    public async Task VersionsAreImmutable()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Assert
        var firstVersion = document.Versions.First();
        firstVersion.VersionNumber.Should().Be(1);
        firstVersion.UploadedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        firstVersion.Hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CanLinkToEntity()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        var orderId = Guid.NewGuid();

        // Act
        document.LinkToEntity(EntityType.Order, orderId, _userId);

        // Assert
        document.EntityLinks.Should().HaveCount(1);
        document.EntityLinks.First().EntityType.Should().Be(EntityType.Order);
        document.EntityLinks.First().EntityId.Should().Be(orderId);
    }

    [Fact]
    public async Task CannotLinkDeletedDocumentToEntity()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.SoftDelete();

        // Act & Assert
        Assert.Throws<DomainException>(() =>
            document.LinkToEntity(EntityType.Order, Guid.NewGuid(), _userId));
    }

    [Fact]
    public async Task CannotLinkSameEntityTwice()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        var orderId = Guid.NewGuid();
        document.LinkToEntity(EntityType.Order, orderId, _userId);

        // Act & Assert
        Assert.Throws<DomainException>(() =>
            document.LinkToEntity(EntityType.Order, orderId, _userId));
    }

    [Fact]
    public async Task CanUnlinkFromEntity()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        var orderId = Guid.NewGuid();
        document.LinkToEntity(EntityType.Order, orderId, _userId);

        // Act
        document.UnlinkFromEntity(EntityType.Order, orderId);

        // Assert
        document.EntityLinks.Should().BeEmpty();
    }

    [Fact]
    public async Task CanAddTag()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act
        document.AddTag("invoice");
        document.AddTag("Q1-2026");

        // Assert
        document.Tags.Should().HaveCount(2);
        document.Tags.Should().Contain("invoice");
        document.Tags.Should().Contain("q1-2026"); // Normalized to lowercase
    }

    [Fact]
    public async Task AddTagIsIdempotent()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act
        document.AddTag("invoice");
        document.AddTag("Invoice"); // Different case

        // Assert
        document.Tags.Should().HaveCount(1); // Only one tag (normalized)
    }

    [Fact]
    public async Task CanRemoveTag()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.AddTag("invoice");

        // Act
        document.RemoveTag("invoice");

        // Assert
        document.Tags.Should().BeEmpty();
    }

    [Fact]
    public async Task CanGrantPermission()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        var otherUserId = UserId.New();

        // Act
        document.GrantPermission(PermissionType.View, otherUserId, _userId);

        // Assert
        document.Permissions.Should().HaveCount(1);
        document.Permissions.First().PermissionType.Should().Be(PermissionType.View);
        document.Permissions.First().GrantedToUserId.Should().Be(otherUserId);
    }

    [Fact]
    public async Task GrantPermissionIsIdempotent()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        var otherUserId = UserId.New();

        // Act
        document.GrantPermission(PermissionType.View, otherUserId, _userId);
        document.GrantPermission(PermissionType.View, otherUserId, _userId); // Duplicate

        // Assert
        document.Permissions.Should().HaveCount(1); // Only one permission
    }

    [Fact]
    public async Task CanRevokePermission()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        var otherUserId = UserId.New();
        document.GrantPermission(PermissionType.View, otherUserId, _userId);

        // Act
        document.RevokePermission(PermissionType.View, otherUserId);

        // Assert
        document.Permissions.Should().BeEmpty();
    }

    [Fact]
    public async Task CanArchiveDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act
        document.Archive();

        // Assert
        document.Status.Should().Be(DocumentStatus.Archived);
        document.ArchivedAt.Should().NotBeNull();
        document.ArchivedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CannotArchiveNonActiveDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.Archive();

        // Act & Assert
        Assert.Throws<DomainException>(() => document.Archive());
    }

    [Fact]
    public async Task CanUnarchiveDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.Archive();

        // Act
        document.Unarchive();

        // Assert
        document.Status.Should().Be(DocumentStatus.Active);
        document.ArchivedAt.Should().BeNull();
    }

    [Fact]
    public async Task CanSoftDeleteDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act
        document.SoftDelete();

        // Assert
        document.Status.Should().Be(DocumentStatus.Deleted);
        document.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CanRestoreDeletedDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.SoftDelete();

        // Act
        document.Restore();

        // Assert
        document.Status.Should().Be(DocumentStatus.Active);
        document.DeletedAt.Should().BeNull();
    }

    [Fact]
    public async Task CanUpdateMetadata()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act
        document.UpdateMetadata("updated.pdf", "Updated description", DateOnly.FromDateTime(DateTime.Today.AddDays(60)));

        // Assert
        document.FileName.Should().Be("updated.pdf");
        document.Description.Should().Be("Updated description");
        document.ExpiryDate.Should().Be(DateOnly.FromDateTime(DateTime.Today.AddDays(60)));
        document.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CannotUpdateDeletedDocument()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);
        document.SoftDelete();

        // Act & Assert
        Assert.Throws<DomainException>(() =>
            document.UpdateMetadata("new.pdf"));
    }

    [Fact]
    public async Task HashIsCalculatedCorrectly()
    {
        // Arrange
        var content = "Test content for hash verification";
        var fileStream = CreateTestFileStream(content);

        // Act
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, fileStream, _blobStorage);

        // Assert
        var version = document.Versions.First();
        version.Hash.Should().NotBeNullOrEmpty();
        version.Hash.Should().HaveLength(64); // SHA-256 hex string length
    }

    [Fact]
    public async Task FSM_ActiveToArchivedToDeleted()
    {
        // Arrange
        var document = await Document.CreateAsync(
            _tenantId, "doc.pdf", "application/pdf", _userId, CreateTestFileStream(), _blobStorage);

        // Act & Assert: Active → Archived
        document.Status.Should().Be(DocumentStatus.Active);
        document.Archive();
        document.Status.Should().Be(DocumentStatus.Archived);

        // Archived → Active
        document.Unarchive();
        document.Status.Should().Be(DocumentStatus.Active);

        // Active → Deleted
        document.SoftDelete();
        document.Status.Should().Be(DocumentStatus.Deleted);

        // Deleted → Active
        document.Restore();
        document.Status.Should().Be(DocumentStatus.Active);
    }
}
