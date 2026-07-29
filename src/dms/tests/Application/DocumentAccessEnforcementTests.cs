using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.Configuration;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Application.Handlers.Commands;
using SpaceOS.Modules.DMS.Application.Handlers.Queries;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Application;

/// <summary>
/// That the access rule is actually ENFORCED — not merely implemented.
/// </summary>
/// <remarks>
/// The rule itself has its own unit tests. These cases exist because a correct rule nobody
/// calls is exactly the state this module was in before: the service existed, and not one
/// handler used it. They are written against the handlers, with the real rule wired in, so a
/// removed check fails here rather than in production.
/// </remarks>
public class DocumentAccessEnforcementTests
{
    private static readonly DmsExpiryOptions Expiry = DmsExpiryOptions.Default;
    private static readonly IDocumentAccessControlService Access = new DocumentAccessControlService();

    private static readonly UserId Owner = new(Guid.Parse("11111111-1111-1111-1111-111111111111"));
    private static readonly UserId Stranger = new(Guid.Parse("22222222-2222-2222-2222-222222222222"));

    private static ICallerContext CallerIs(UserId user)
    {
        var caller = new Mock<ICallerContext>();
        caller.SetupGet(c => c.UserId).Returns(user.Value);
        caller.SetupGet(c => c.RoleIds).Returns(new HashSet<Guid>());
        return caller.Object;
    }

    private static Document OwnedDocument() => Document.Create(
        new TenantId(Guid.NewGuid()),
        name: "Keretszerződés",
        type: DocType.Contract,
        linkType: DocLinkType.None,
        linkId: null,
        linkLabel: string.Empty,
        owner: "Szabó Anna",
        note: null,
        fileLabel: "szerzodes.pdf",
        validUntil: null,
        ownerUserId: Owner);

    private static Mock<IDocumentRepository> Returning(Document document)
    {
        var repository = new Mock<IDocumentRepository>();
        repository
            .Setup(r => r.GetByIdAsync(It.IsAny<DocumentId>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(document);
        return repository;
    }

    [Fact]
    public async Task A_stranger_cannot_transition_someone_elses_document()
    {
        // Same tenant, so RLS returned the row — and this is where it stops. Not-found rather
        // than forbidden: the answer must not reveal that the document exists.
        var document = OwnedDocument();
        var repository = Returning(document);
        var handler = new SubmitDocumentHandler(
            repository.Object, Access, CallerIs(Stranger), Expiry,
            NullLogger<SubmitDocumentHandler>.Instance);

        var act = () => handler.Handle(new SubmitDocumentCommand(document.Id.Value), default);

        await act.Should().ThrowAsync<KeyNotFoundException>();
        repository.Verify(
            r => r.UpdateAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task A_viewer_is_told_they_may_not_change_it()
    {
        // This caller CAN see the document, so hiding the refusal would only produce a screen
        // that fails for no visible reason. 403, not 404.
        var document = OwnedDocument();
        document.GrantPermission(PermissionType.View, Stranger, roleId: null, grantedBy: Owner);
        var repository = Returning(document);
        var handler = new ApproveDocumentHandler(
            repository.Object, Access, CallerIs(Stranger), Expiry,
            NullLogger<ApproveDocumentHandler>.Instance);

        var act = () => handler.Handle(new ApproveDocumentCommand(document.Id.Value, null), default);

        await act.Should().ThrowAsync<DocumentAccessDeniedException>();
        repository.Verify(
            r => r.UpdateAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task An_edit_grant_lets_a_colleague_transition_it()
    {
        // The rule must not simply deny everyone: a granted colleague still gets through.
        var document = OwnedDocument();
        document.GrantPermission(PermissionType.Edit, Stranger, roleId: null, grantedBy: Owner);
        var repository = Returning(document);
        var handler = new SubmitDocumentHandler(
            repository.Object, Access, CallerIs(Stranger), Expiry,
            NullLogger<SubmitDocumentHandler>.Instance);

        var dto = await handler.Handle(new SubmitDocumentCommand(document.Id.Value), default);

        dto.Status.Should().Be(DocumentStatus.UnderReview);
        repository.Verify(
            r => r.UpdateAsync(document, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task A_stranger_cannot_upload_a_new_version()
    {
        var document = OwnedDocument();
        var repository = Returning(document);
        var handler = new UploadDocumentVersionHandler(
            repository.Object, Access, CallerIs(Stranger), Expiry,
            NullLogger<UploadDocumentVersionHandler>.Instance);

        var act = () => handler.Handle(
            new UploadDocumentVersionCommand(document.Id.Value, "uj.pdf", "Módosítás", null), default);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task A_viewer_may_not_upload_a_new_version()
    {
        var document = OwnedDocument();
        document.GrantPermission(PermissionType.View, Stranger, roleId: null, grantedBy: Owner);
        var handler = new UploadDocumentVersionHandler(
            Returning(document).Object, Access, CallerIs(Stranger), Expiry,
            NullLogger<UploadDocumentVersionHandler>.Instance);

        var act = () => handler.Handle(
            new UploadDocumentVersionCommand(document.Id.Value, "uj.pdf", "Módosítás", null), default);

        await act.Should().ThrowAsync<DocumentAccessDeniedException>();
    }

    [Fact]
    public async Task A_stranger_reading_the_document_gets_nothing()
    {
        // Null here becomes the endpoint's 404 — the same answer as for a document that is not
        // there, which is the point.
        var document = OwnedDocument();
        var handler = new GetDocumentHandler(
            Returning(document).Object, Access, CallerIs(Stranger), Expiry);

        var dto = await handler.Handle(new GetDocumentQuery(document.Id.Value), default);

        dto.Should().BeNull();
    }

    [Fact]
    public async Task A_new_document_belongs_to_whoever_created_it()
    {
        // Without this, every new document would be born WITHOUT an owner identity and would
        // fall under the legacy read-for-everyone exception — fail-closed would then protect
        // nothing that anyone actually creates.
        Document? saved = null;
        var repository = new Mock<IDocumentRepository>();
        repository
            .Setup(r => r.AddAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback((Document document, CancellationToken _) => saved = document);

        var handler = new CreateDocumentHandler(
            repository.Object, CallerIs(Owner), Expiry, NullLogger<CreateDocumentHandler>.Instance);

        await handler.Handle(
            new CreateDocumentCommand(
                TenantId: Guid.NewGuid(),
                Name: "Új terv",
                Type: DocType.Drawing,
                LinkType: DocLinkType.None,
                LinkId: null,
                LinkLabel: string.Empty,
                Owner: "Szabó Anna",
                Note: null,
                FileLabel: "terv.pdf",
                ValidUntil: null),
            default);

        saved.Should().NotBeNull();
        saved!.OwnerUserId.Should().Be(Owner);
    }

    [Fact]
    public async Task The_owner_still_reads_their_own_document()
    {
        var document = OwnedDocument();
        var handler = new GetDocumentHandler(
            Returning(document).Object, Access, CallerIs(Owner), Expiry);

        var dto = await handler.Handle(new GetDocumentQuery(document.Id.Value), default);

        dto.Should().NotBeNull();
    }
}
