using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.Configuration;
using SpaceOS.Modules.DMS.Application.Handlers.Commands;
using SpaceOS.Modules.DMS.Application.Handlers.Queries;
using SpaceOS.Modules.DMS.Application.Mapping;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Application;

/// <summary>
/// Application-layer tests (mocked repository): load → domain action → persist
/// → fresh DTO mapping with the COMPUTED releasedVersion/expiry fields
/// (portal serveDocument mirror), the expiring-window cutoff computation and
/// the 404 contract (KeyNotFoundException).
/// </summary>
public class DocumentHandlerTests
{
    private static readonly DmsExpiryOptions Expiry = DmsExpiryOptions.Default;

    private static Document SampleDocument(DateOnly? validUntil = null) => Document.Create(
        new TenantId(Guid.NewGuid()),
        name: "Bognár Bútor Kft. — keretszerződés 2026",
        type: DocType.Szerzodes,
        linkType: DocLinkType.Customer,
        linkId: "C-001",
        linkLabel: "Bognár Bútor Kft.",
        owner: "Szabó Anna",
        note: null,
        fileLabel: "bognar-keretszerzodes-2026.pdf",
        validUntil: validUntil);

    private static Mock<IDocumentRepository> RepositoryReturning(Document? document)
    {
        var repository = new Mock<IDocumentRepository>();
        repository
            .Setup(r => r.GetByIdAsync(It.IsAny<DocumentId>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(document);
        return repository;
    }

    [Fact]
    public async Task SubmitHandler_AppliesTransition_Persists_AndReturnsFreshDto()
    {
        var document = SampleDocument();
        var repository = RepositoryReturning(document);
        var handler = new SubmitDocumentHandler(
            repository.Object, Expiry, NullLogger<SubmitDocumentHandler>.Instance);

        var dto = await handler.Handle(new SubmitDocumentCommand(document.Id.Value), default);

        dto.Status.Should().Be(DocumentStatus.UnderReview);
        dto.Versions.Single().Status.Should().Be(DocumentStatus.UnderReview);
        repository.Verify(
            r => r.UpdateAsync(document, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TransitionHandler_UnknownDocument_ThrowsKeyNotFound()
    {
        var handler = new ArchiveDocumentHandler(
            RepositoryReturning(null).Object, Expiry, NullLogger<ArchiveDocumentHandler>.Instance);

        var act = () => handler.Handle(new ArchiveDocumentCommand(Guid.NewGuid()), default);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Dokumentum nem található");
    }

    [Fact]
    public async Task UploadVersionHandler_ReturnsDtoWithIncrementedVersion()
    {
        var document = SampleDocument();
        var repository = RepositoryReturning(document);
        var handler = new UploadDocumentVersionHandler(
            repository.Object, Expiry, NullLogger<UploadDocumentVersionHandler>.Instance);

        var dto = await handler.Handle(
            new UploadDocumentVersionCommand(
                document.Id.Value, "bognar-keretszerzodes-2027.pdf", "Hosszabbítás", null),
            default);

        dto.Version.Should().Be(2);
        dto.Status.Should().Be(DocumentStatus.Draft);
        dto.Versions.Should().HaveCount(2);
        repository.Verify(
            r => r.UpdateAsync(document, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ListHandler_ExpiringOnly_ComputesConfigDrivenCutoff()
    {
        DocumentFilter? captured = null;
        var repository = new Mock<IDocumentRepository>();
        repository
            .Setup(r => r.ListAsync(It.IsAny<DocumentFilter>(), It.IsAny<CancellationToken>()))
            .Callback((DocumentFilter filter, CancellationToken _) => captured = filter)
            .ReturnsAsync(Array.Empty<Document>());

        var options = new DmsExpiryOptions(WarnDays: 14);
        var handler = new ListDocumentsHandler(repository.Object, options);

        var before = ServeDay.Today();
        await handler.Handle(new ListDocumentsQuery(ExpiringOnly: true), default);
        var after = ServeDay.Today();

        captured.Should().NotBeNull();
        // The cutoff = today + WarnDays (config-driven; midnight-race tolerant bounds)
        captured!.ExpiresOnOrBefore.Should().NotBeNull();
        captured.ExpiresOnOrBefore!.Value.Should().BeOnOrAfter(before.AddDays(14))
            .And.BeOnOrBefore(after.AddDays(14));
    }

    [Fact]
    public async Task ListHandler_WithoutExpiring_LeavesCutoffNull()
    {
        DocumentFilter? captured = null;
        var repository = new Mock<IDocumentRepository>();
        repository
            .Setup(r => r.ListAsync(It.IsAny<DocumentFilter>(), It.IsAny<CancellationToken>()))
            .Callback((DocumentFilter filter, CancellationToken _) => captured = filter)
            .ReturnsAsync(Array.Empty<Document>());

        var handler = new ListDocumentsHandler(repository.Object, Expiry);

        await handler.Handle(
            new ListDocumentsQuery(Status: DocumentStatus.Released, Search: "konyha"), default);

        captured!.ExpiresOnOrBefore.Should().BeNull();
        captured.Status.Should().Be(DocumentStatus.Released);
        captured.Search.Should().Be("konyha");
    }

    [Fact]
    public async Task GetHandler_MapsComputedFields_ReleasedVersionAndExpiry()
    {
        // Released document expiring within the window → runVersion + 'lejaro'
        var document = SampleDocument(validUntil: ServeDay.Today().AddDays(10));
        document.SubmitForReview();
        document.Approve();
        var handler = new GetDocumentHandler(RepositoryReturning(document).Object, Expiry);

        var dto = await handler.Handle(new GetDocumentQuery(document.Id.Value), default);

        dto.Should().NotBeNull();
        dto!.ReleasedVersion.Should().Be(1, "kiadott → az aktuális verzió az érvényes");
        dto.Expiry.Should().Be(ExpiryState.Lejaro, "az ablakon belül jár le");
    }

    [Fact]
    public async Task GetHandler_UnknownDocument_ReturnsNull()
    {
        var handler = new GetDocumentHandler(RepositoryReturning(null).Object, Expiry);

        var dto = await handler.Handle(new GetDocumentQuery(Guid.NewGuid()), default);

        dto.Should().BeNull();
    }
}
