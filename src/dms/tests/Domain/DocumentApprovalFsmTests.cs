using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.FSM;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Domain;

/// <summary>
/// Document approval-workflow FSM tests — the portal DOCUMENT_FSM /
/// documentFsm.test.ts mirror: main path (draft → review → released),
/// reject/recall/archive/reopen branches, guard messages (MSW parity) and the
/// version-chain snapshot rules.
/// </summary>
public class DocumentApprovalFsmTests
{
    private static readonly TenantId Tenant = new(Guid.Parse("11111111-1111-1111-1111-111111111111"));

    private static Document CreateDraft(DateOnly? validUntil = null) => Document.Create(
        Tenant,
        name: "Petőfi u. 12. — konyha kiviteli rajz",
        type: DocType.Drawing,
        linkType: DocLinkType.Project,
        linkId: "PRJ-2026-014",
        linkLabel: "Petőfi u. 12. — Konyha + nappali",
        owner: "Kovács Péter",
        note: "Kiviteli terv",
        fileLabel: "petofi-konyha-kiviteli-v1.pdf",
        validUntil: validUntil);

    /// <summary>Drives a fresh document into the requested status via legal transitions.</summary>
    private static Document InStatus(DocumentStatus status)
    {
        var document = CreateDraft();
        switch (status)
        {
            case DocumentStatus.Draft:
                break;
            case DocumentStatus.UnderReview:
                document.SubmitForReview();
                break;
            case DocumentStatus.Released:
                document.SubmitForReview();
                document.Approve();
                break;
            case DocumentStatus.Archived:
                document.SubmitForReview();
                document.Approve();
                document.Archive();
                break;
            case DocumentStatus.Deleted:
                document.SoftDelete();
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(status));
        }

        return document;
    }

    private static void Invoke(Document document, DocumentAction action)
    {
        switch (action)
        {
            case DocumentAction.Submit: document.SubmitForReview(); break;
            case DocumentAction.Approve: document.Approve(); break;
            case DocumentAction.Reject: document.Reject("Méret-eltérés a 4. lapon"); break;
            case DocumentAction.Recall: document.Recall(); break;
            case DocumentAction.Archive: document.Archive(); break;
            case DocumentAction.Reopen: document.Reopen(); break;
            default: throw new ArgumentOutOfRangeException(nameof(action));
        }
    }

    // ── Creation ────────────────────────────────────────────────────────────

    [Fact]
    public void Create_StartsAsDraft_WithV1WorkingCopy()
    {
        var document = CreateDraft();

        document.Status.Should().Be(DocumentStatus.Draft);
        document.CurrentVersion.Should().Be(1);
        document.Versions.Should().ContainSingle()
            .Which.Status.Should().Be(DocumentStatus.Draft);
        document.ReviewNote.Should().BeNull();
        document.GetReleasedVersion().Should().BeNull("sosem volt kiadva → blocked");
    }

    // ── FSM table — portal DOCUMENT_FSM mirror (allowed + forbidden) ────────

    [Theory]
    [InlineData(DocumentAction.Submit, DocumentStatus.Draft, DocumentStatus.UnderReview)]
    [InlineData(DocumentAction.Approve, DocumentStatus.UnderReview, DocumentStatus.Released)]
    [InlineData(DocumentAction.Reject, DocumentStatus.UnderReview, DocumentStatus.Draft)]
    [InlineData(DocumentAction.Recall, DocumentStatus.Released, DocumentStatus.UnderReview)]
    [InlineData(DocumentAction.Archive, DocumentStatus.Draft, DocumentStatus.Archived)]
    [InlineData(DocumentAction.Archive, DocumentStatus.Released, DocumentStatus.Archived)]
    [InlineData(DocumentAction.Reopen, DocumentStatus.Archived, DocumentStatus.Draft)]
    public void AllowedTransitions_MovePortalMirrorTable(
        DocumentAction action, DocumentStatus from, DocumentStatus to)
    {
        var document = InStatus(from);

        Invoke(document, action);

        document.Status.Should().Be(to);
    }

    [Fact]
    public void ForbiddenTransitions_ThrowConflict_ForEveryOffTableCombination()
    {
        // Adversarial sweep: every (action, status) pair OUTSIDE the portal
        // table must raise the 409-mapped exception with the MSW guard message.
        foreach (var action in DocumentStatusTransitions.Actions)
        {
            foreach (var from in new[]
            {
                DocumentStatus.Draft, DocumentStatus.UnderReview,
                DocumentStatus.Released, DocumentStatus.Archived, DocumentStatus.Deleted,
            })
            {
                if (DocumentStatusTransitions.CanTransition(action, from))
                    continue;

                var document = InStatus(from);
                var act = () => Invoke(document, action);

                act.Should().Throw<InvalidStatusTransitionException>(
                        $"a(z) {action} művelet {from} állapotból tiltott")
                    .WithMessage(DocumentGuardMessages.InvalidTransition(from, action));
            }
        }
    }

    [Fact]
    public void Approve_FromDraft_IsForbidden_NoDirectRelease()
    {
        // Approval gate (portal mirror): no release without review
        var document = CreateDraft();

        var act = () => document.Approve();

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Fact]
    public void Archive_DuringReview_IsForbidden()
    {
        var document = InStatus(DocumentStatus.UnderReview);

        var act = () => document.Archive();

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    // ── Review notes + version snapshot tracking ────────────────────────────

    [Fact]
    public void Submit_TracksCurrentVersionSnapshot_AndClearsReviewNote()
    {
        var document = CreateDraft();

        document.SubmitForReview();

        document.Versions.Single().Status.Should().Be(DocumentStatus.UnderReview);
        document.ReviewNote.Should().BeNull();
    }

    [Fact]
    public void Approve_StoresOptionalNote_AndTracksVersion()
    {
        var document = InStatus(DocumentStatus.UnderReview);

        document.Approve("Gyártásra kiadható.");

        document.Status.Should().Be(DocumentStatus.Released);
        document.ReviewNote.Should().Be("Gyártásra kiadható.");
        document.Versions.Single().Status.Should().Be(DocumentStatus.Released);
    }

    [Fact]
    public void Reject_WithoutReason_ThrowsPayloadGuard_NotConflict()
    {
        // Portal rejectReasonBlockReason mirror: 400, not 409
        var document = InStatus(DocumentStatus.UnderReview);

        var act = () => document.Reject("   ");

        act.Should().Throw<DomainException>()
            .WithMessage(DocumentGuardMessages.RejectReasonRequired)
            .Which.Should().NotBeOfType<InvalidStatusTransitionException>(
                "payload-guard → 400, nem FSM-sértés (409)");
        document.Status.Should().Be(DocumentStatus.UnderReview, "a guard nem léptethet állapotot");
    }

    [Fact]
    public void Reject_ReturnsToDraft_WithReasonAsReviewNote()
    {
        var document = InStatus(DocumentStatus.UnderReview);

        document.Reject("Méret-eltérés a 4. lapon");

        document.Status.Should().Be(DocumentStatus.Draft);
        document.ReviewNote.Should().Be("Méret-eltérés a 4. lapon");
        document.Versions.Single().Status.Should().Be(DocumentStatus.Draft);
    }

    [Fact]
    public void Archive_ClearsReviewNote_AndDoesNotTouchChain()
    {
        var document = InStatus(DocumentStatus.UnderReview);
        document.Approve("Kiadva");

        document.Archive();

        document.Status.Should().Be(DocumentStatus.Archived);
        document.ReviewNote.Should().BeNull("az MSW applyTransition null-t ír archive-nál");
        document.Versions.Single().Status.Should().Be(
            DocumentStatus.Released, "a kiadás ténye megőrzött történet");
        document.GetReleasedVersion().Should().Be(1, "archivált láncból is a kiadott verzió jön");
    }

    // ── Version chain ───────────────────────────────────────────────────────

    [Fact]
    public void AddVersion_IncrementsNumber_PreservesChain_AndFallsBackToDraft()
    {
        var document = InStatus(DocumentStatus.Released);

        var entry = document.AddVersion("petofi-konyha-kiviteli-v2.pdf", "Ügyfél-módosítás: sziget");

        entry.VersionNumber.Should().Be(2);
        entry.Status.Should().Be(DocumentStatus.Draft, "az új verzió piszkozat munkapéldány");
        document.CurrentVersion.Should().Be(2);
        document.Status.Should().Be(DocumentStatus.Draft);
        document.FileLabel.Should().Be("petofi-konyha-kiviteli-v2.pdf");
        document.ReviewNote.Should().BeNull();
        document.Versions.Should().HaveCount(2, "a korábbi verziók megőrződnek");
        document.Versions.First(v => v.VersionNumber == 1).Status
            .Should().Be(DocumentStatus.Released, "a kiadott v1 marad az érvényes");
        document.GetReleasedVersion().Should().Be(1);
    }

    [Fact]
    public void AddVersion_UploadedByFallsBackToOwner()
    {
        var document = CreateDraft();

        var entry = document.AddVersion("v2.pdf", "Módosítás", uploadedBy: null);

        entry.UploadedBy.Should().Be("Kovács Péter");
    }

    [Fact]
    public void AddVersion_OnArchived_ThrowsConflict_WithMswMessage()
    {
        var document = InStatus(DocumentStatus.Archived);

        var act = () => document.AddVersion("v2.pdf", "Módosítás");

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage(DocumentGuardMessages.UploadVersionArchived);
    }

    [Fact]
    public void AddVersion_OnDeleted_ThrowsConflict()
    {
        var document = InStatus(DocumentStatus.Deleted);

        var act = () => document.AddVersion("v2.pdf", "Módosítás");

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage(DocumentGuardMessages.UploadVersionDeleted);
    }

    [Theory]
    [InlineData("", "Módosítás", DocumentGuardMessages.VersionFileLabelRequired)]
    [InlineData("v2.pdf", "  ", DocumentGuardMessages.VersionChangeNoteRequired)]
    public void AddVersion_MissingFields_ThrowsPayloadGuard(
        string fileLabel, string changeNote, string expectedMessage)
    {
        var document = CreateDraft();

        var act = () => document.AddVersion(fileLabel, changeNote);

        act.Should().Throw<DomainException>().WithMessage(expectedMessage);
        document.CurrentVersion.Should().Be(1, "a guard nem léptethet verziót");
    }

    // ── Released-version calculation (portal releasedVersionInfo mirror) ─────

    [Fact]
    public void GetReleasedVersion_WhenCurrentIsReleased_ReturnsCurrent()
    {
        var document = InStatus(DocumentStatus.Released);

        document.GetReleasedVersion().Should().Be(1);
    }

    [Fact]
    public void Recall_FallsBackToPreviousReleasedVersion()
    {
        // v1 released → v2 uploaded + released → recall v2 → the shop floor
        // falls back to v1 (portal dmsApi.test mirror)
        var document = InStatus(DocumentStatus.Released);
        document.AddVersion("v2.pdf", "Pánt-furat raszter 32→37mm");
        document.SubmitForReview();
        document.Approve();
        document.GetReleasedVersion().Should().Be(2);

        document.Recall("Felülvizsgálat");

        document.Status.Should().Be(DocumentStatus.UnderReview);
        document.ReviewNote.Should().Be("Felülvizsgálat");
        document.GetReleasedVersion().Should().Be(1, "a korábbi kiadottra esik vissza");
    }

    [Fact]
    public void GetReleasedVersion_NeverReleased_ReturnsNull_Blocked()
    {
        var document = CreateDraft();
        document.SubmitForReview();

        document.GetReleasedVersion().Should().BeNull("gyártásban nem használható (blocked)");
    }

    // ── Expiry calculation (portal expiryState mirror, config window) ────────

    [Theory]
    [InlineData(null, 30, null)]          // nincs érvényességi dátum
    [InlineData(-1, 30, ExpiryState.Expired)]   // tegnap lejárt
    [InlineData(0, 30, ExpiryState.Expiring)]    // a validUntil napja még érvényes → lejaro
    [InlineData(30, 30, ExpiryState.Expiring)]   // ablak-határ
    [InlineData(31, 30, null)]                 // ablakon kívül
    [InlineData(10, 7, null)]                  // paraméterezhető küszöb (config-tükör)
    [InlineData(5, 7, ExpiryState.Expiring)]
    public void GetExpiryState_MirrorsPortalCalc(int? daysFromToday, int warnDays, ExpiryState? expected)
    {
        var today = new DateOnly(2026, 7, 16);
        var document = CreateDraft(daysFromToday is { } d ? today.AddDays(d) : null);

        document.GetExpiryState(today, warnDays).Should().Be(expected);
    }

    // ── Admin soft delete (outside the FSM) ─────────────────────────────────

    [Fact]
    public void SoftDelete_BlocksFsmActions_AndRestoreReturnsDraft()
    {
        var document = CreateDraft();
        document.SoftDelete();

        var act = () => document.SubmitForReview();
        act.Should().Throw<InvalidStatusTransitionException>();

        document.Restore();
        document.Status.Should().Be(DocumentStatus.Draft, "visszaállítás után újra jóváhagyandó");
    }
}
