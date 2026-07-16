using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.DMS.Api.Endpoints;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.FSM;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Api;

/// <summary>
/// REST-layer contract tests for DocumentEndpoints (TestServer + mocked
/// IMediator — QA TicketEndpointsTests pattern): route set, filter parsing,
/// camelCase enum wire format and the module error contract
/// (200 fresh DTO / 201 created / 400 payload guard / 404 / 409 FSM guard)
/// with the MSW-mirror {error, message} bodies.
/// Mirror: portal src/modules/dms/mocks/handlers.documents.ts.
/// </summary>
public class DocumentEndpointsTests
{
    private static readonly Guid DocumentGuid = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DocumentDto SampleDto(
        DocumentStatus status = DocumentStatus.Draft,
        int version = 1,
        int? releasedVersion = null,
        ExpiryState? expiry = null) => new(
        Id: DocumentGuid,
        Name: "Petőfi u. 12. — konyha kiviteli rajz",
        Type: DocType.Rajz,
        Status: status,
        Version: version,
        LinkType: DocLinkType.Project,
        LinkId: "PRJ-2026-014",
        LinkLabel: "Petőfi u. 12. — Konyha + nappali",
        Owner: "Kovács Péter",
        Note: "Kiviteli terv",
        ReviewNote: null,
        FileLabel: "petofi-konyha-kiviteli-v1.pdf",
        ValidUntil: null,
        UpdatedAt: DateTime.UtcNow,
        Versions: new[]
        {
            new DocumentVersionDto(1, "petofi-konyha-kiviteli-v1.pdf", "Első verzió",
                status, "Kovács Péter", DateTime.UtcNow),
        },
        ReleasedVersion: releasedVersion,
        Expiry: expiry);

    private static Task<DmsEndpointTestHost> StartHostAsync(IMediator mediator)
        => DmsEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapDocumentEndpoints());

    // ========== LIST ==========

    [Fact]
    public async Task ListDocuments_ReturnsOk_WithCamelCaseEnumWireFormat()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ListDocumentsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { SampleDto(DocumentStatus.UnderReview, expiry: ExpiryState.Lejaro) });

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/dms/documents");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetArrayLength().Should().Be(1);
        var row = body.RootElement[0];
        // Portal zod-schema parity: camelCase enum strings + computed fields
        row.GetProperty("status").GetString().Should().Be("underReview");
        row.GetProperty("type").GetString().Should().Be("rajz");
        row.GetProperty("linkType").GetString().Should().Be("project");
        row.GetProperty("expiry").GetString().Should().Be("lejaro");
        row.GetProperty("releasedVersion").ValueKind.Should().Be(JsonValueKind.Null);
        row.GetProperty("versions")[0].GetProperty("v").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task ListDocuments_PassesFiltersToQuery()
    {
        ListDocumentsQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ListDocumentsQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<IReadOnlyList<DocumentDto>> query, CancellationToken _) =>
                captured = (ListDocumentsQuery)query)
            .ReturnsAsync(Array.Empty<DocumentDto>());

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync(
            "/api/dms/documents?status=underReview&type=rajz&linkType=project&q=konyha&expiring=true");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.Status.Should().Be(DocumentStatus.UnderReview);
        captured.Type.Should().Be(DocType.Rajz);
        captured.LinkType.Should().Be(DocLinkType.Project);
        captured.Search.Should().Be("konyha");
        captured.ExpiringOnly.Should().BeTrue();
    }

    [Fact]
    public async Task ListDocuments_InvalidStatusFilter_Returns400WithErrorBody()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/dms/documents?status=nemletezik");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Be("BadRequest");
    }

    // ========== DETAIL ==========

    [Fact]
    public async Task GetDocument_Found_ReturnsOkDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetDocumentQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDto());

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/dms/documents/{DocumentGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(DocumentGuid);
    }

    [Fact]
    public async Task GetDocument_Missing_Returns404WithMswBody()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetDocumentQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DocumentDto?)null);

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/dms/documents/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Be("NotFound");
        body.RootElement.GetProperty("message").GetString().Should().Be("Dokumentum nem található");
    }

    // ========== CREATE ==========

    [Fact]
    public async Task CreateDocument_Valid_Returns201WithBodyAndLocation()
    {
        CreateDocumentCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateDocumentCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<DocumentDto> command, CancellationToken _) =>
                captured = (CreateDocumentCommand)command)
            .ReturnsAsync(SampleDto());

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync("/api/dms/documents", new
        {
            name = "Petőfi u. 12. — konyha kiviteli rajz",
            type = "rajz",
            linkType = "project",
            linkId = "PRJ-2026-014",
            linkLabel = "Petőfi u. 12. — Konyha + nappali",
            owner = "Kovács Péter",
            fileLabel = "petofi-konyha-kiviteli-v1.pdf",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().Be($"/api/dms/documents/{DocumentGuid}");
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(DmsEndpointTestHost.TenantId);
        captured.Type.Should().Be(DocType.Rajz);
        captured.LinkType.Should().Be(DocLinkType.Project);
    }

    [Fact]
    public async Task CreateDocument_InvalidType_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PostAsJsonAsync("/api/dms/documents", new
        {
            name = "Teszt",
            type = "nemletezik",
            owner = "Kovács Péter",
            fileLabel = "t.pdf",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ========== FSM TRANSITIONS ==========

    [Fact]
    public async Task SubmitDocument_ReturnsFreshDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<SubmitDocumentCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDto(DocumentStatus.UnderReview));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/submit", new { });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("underReview");
    }

    [Fact]
    public async Task ApproveDocument_PassesNoteToCommand()
    {
        ApproveDocumentCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ApproveDocumentCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<DocumentDto> command, CancellationToken _) =>
                captured = (ApproveDocumentCommand)command)
            .ReturnsAsync(SampleDto(DocumentStatus.Released, releasedVersion: 1));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/approve", new { note = "Gyártásra kiadható." });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.Note.Should().Be("Gyártásra kiadható.");
        captured.DocumentId.Should().Be(DocumentGuid);
    }

    [Fact]
    public async Task RejectDocument_PassesReasonToCommand()
    {
        RejectDocumentCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RejectDocumentCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<DocumentDto> command, CancellationToken _) =>
                captured = (RejectDocumentCommand)command)
            .ReturnsAsync(SampleDto());

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/reject", new { reason = "Méret-eltérés" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Reason.Should().Be("Méret-eltérés");
    }

    [Fact]
    public async Task RejectDocument_MissingReason_Returns400WithMswGuardMessage()
    {
        // The domain guard throws — the endpoint maps it to 400 (MSW mirror)
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RejectDocumentCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DomainException(DocumentGuardMessages.RejectReasonRequired));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/reject", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Be("BadRequest");
        body.RootElement.GetProperty("message").GetString()
            .Should().Be(DocumentGuardMessages.RejectReasonRequired);
    }

    [Fact]
    public async Task Transition_IllegalFsm_Returns409WithMswBody()
    {
        var guardMessage = DocumentGuardMessages.InvalidTransition(
            DocumentStatus.Archived, DocumentAction.Submit);
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<SubmitDocumentCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidStatusTransitionException(guardMessage));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/submit", new { });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Be("Conflict");
        body.RootElement.GetProperty("message").GetString().Should().Be(guardMessage);
    }

    [Fact]
    public async Task Transition_UnknownDocument_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ArchiveDocumentCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new KeyNotFoundException("Dokumentum nem található"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{Guid.NewGuid()}/archive", new { });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("recall")]
    [InlineData("reopen")]
    public async Task RemainingTransitionRoutes_AreMapped(string action)
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<IRequest<DocumentDto>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDto());

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/{action}", new { });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ========== VERSION UPLOAD ==========

    [Fact]
    public async Task UploadVersion_PassesFieldsToCommand_AndReturnsFreshDto()
    {
        UploadDocumentVersionCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<UploadDocumentVersionCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<DocumentDto> command, CancellationToken _) =>
                captured = (UploadDocumentVersionCommand)command)
            .ReturnsAsync(SampleDto(version: 2));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/versions",
            new { fileLabel = "petofi-konyha-kiviteli-v2.pdf", note = "Ügyfél-módosítás: sziget" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.FileLabel.Should().Be("petofi-konyha-kiviteli-v2.pdf");
        captured.ChangeNote.Should().Be("Ügyfél-módosítás: sziget");
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("version").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task UploadVersion_OnArchived_Returns409WithMswGuardMessage()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<UploadDocumentVersionCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidStatusTransitionException(DocumentGuardMessages.UploadVersionArchived));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/versions",
            new { fileLabel = "v2.pdf", note = "Módosítás" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("message").GetString()
            .Should().Be(DocumentGuardMessages.UploadVersionArchived);
    }

    [Fact]
    public async Task UploadVersion_MissingFields_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<UploadDocumentVersionCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DomainException(DocumentGuardMessages.VersionFileLabelRequired));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/dms/documents/{DocumentGuid}/versions", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("message").GetString()
            .Should().Be(DocumentGuardMessages.VersionFileLabelRequired);
    }
}
