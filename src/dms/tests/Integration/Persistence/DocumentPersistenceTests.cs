using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Tests.Integration.Api;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Integration.Persistence;

/// <summary>
/// Document persistence integration tests (real PostgreSQL, applied
/// migrations): aggregate round-trip with the version chain, transition
/// persistence with the released-version fallback, list filters and
/// soft-delete invisibility — the "bigger picture" layer above the pure
/// domain tests (QUALITY.md 4.).
/// </summary>
[Collection("DMS API Tests")]
public class DocumentPersistenceTests
{
    private readonly ApiTestFixture _fixture;

    public DocumentPersistenceTests(ApiTestFixture fixture)
    {
        _fixture = fixture;
    }

    private static Document NewDocument(
        string name = "Doorstar ajtó sorozat — gyártási rajz",
        DocType type = DocType.Drawing,
        DocLinkType linkType = DocLinkType.Order,
        DateOnly? validUntil = null)
        => Document.Create(
            new TenantId(ApiTestFixture.TenantId),
            name: name,
            type: type,
            linkType: linkType,
            linkId: "JT-2426-0182",
            linkLabel: "Doorstar Hungary Zrt. — ajtók",
            owner: "Kovács Péter",
            note: null,
            fileLabel: $"{Guid.NewGuid():N}.pdf",
            validUntil: validUntil);

    private IDocumentRepository Repository(IServiceScope scope)
        => scope.ServiceProvider.GetRequiredService<IDocumentRepository>();

    [Fact]
    public async Task Document_RoundTrip_PersistsVersionChainAndReleasedFallback()
    {
        // v1 released → v2 draft uploaded → recall scenario persisted across contexts
        var document = NewDocument();
        document.SubmitForReview();
        document.Approve("Gyártásra kiadható.");

        using (var scope = _fixture.CreateScope())
        {
            await Repository(scope).AddAsync(document);
        }

        // Fresh context: reload, upload v2, persist
        using (var scope = _fixture.CreateScope())
        {
            var repository = Repository(scope);
            var reloaded = await repository.GetByIdAsync(document.Id);
            reloaded.Should().NotBeNull();
            reloaded!.Status.Should().Be(DocumentStatus.Released);
            reloaded.ReviewNote.Should().Be("Gyártásra kiadható.");
            reloaded.Versions.Should().ContainSingle()
                .Which.Status.Should().Be(DocumentStatus.Released);

            reloaded.AddVersion("doorstar-ajto-gyartasi-v2.pdf", "Pánt-furat raszter 32→37mm");
            await repository.UpdateAsync(reloaded);
        }

        // Fresh context: the chain is preserved, the shop floor stays on v1
        using (var scope = _fixture.CreateScope())
        {
            var reloaded = await Repository(scope).GetByIdAsync(document.Id);
            reloaded!.CurrentVersion.Should().Be(2);
            reloaded.Status.Should().Be(DocumentStatus.Draft, "az új verzió piszkozat munkapéldány");
            reloaded.Versions.Should().HaveCount(2, "a korábbi verziók megőrződnek");
            reloaded.Versions.Single(v => v.VersionNumber == 1).Status
                .Should().Be(DocumentStatus.Released);
            reloaded.GetReleasedVersion().Should().Be(1, "a kiadott v1 marad az érvényes");
            reloaded.FileLabel.Should().Be("doorstar-ajto-gyartasi-v2.pdf");
        }
    }

    [Fact]
    public async Task ListAsync_Filters_StatusTypeSearch()
    {
        var draft = NewDocument(name: "Belváros Café — pultsor kiviteli rajz FILTERTEST");
        var released = NewDocument(name: "Élzárás munkautasítás FILTERTEST", type: DocType.Instruction);
        released.SubmitForReview();
        released.Approve();

        using (var scope = _fixture.CreateScope())
        {
            var repository = Repository(scope);
            await repository.AddAsync(draft);
            await repository.AddAsync(released);
        }

        using (var scope = _fixture.CreateScope())
        {
            var repository = Repository(scope);

            var draftRows = await repository.ListAsync(new DocumentFilter(
                Status: DocumentStatus.Draft, Search: "FILTERTEST"));
            draftRows.Should().ContainSingle().Which.Id.Should().Be(draft.Id);

            var typeRows = await repository.ListAsync(new DocumentFilter(
                Type: DocType.Instruction, Search: "filtertest"));
            typeRows.Should().ContainSingle("az ILike kis-nagybetű független")
                .Which.Id.Should().Be(released.Id);
        }
    }

    [Fact]
    public async Task ListAsync_ExpiringWindow_ExcludesArchived_OrdersByValidity()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var expired = NewDocument(name: "FSC eredetigazolás EXPIRYTEST",
            type: DocType.Certificate, validUntil: today.AddDays(-10));
        expired.SubmitForReview();
        expired.Approve();

        var expiring = NewDocument(name: "Keretszerződés EXPIRYTEST",
            type: DocType.Contract, validUntil: today.AddDays(14));

        var archivedExpired = NewDocument(name: "CE 2025 EXPIRYTEST",
            type: DocType.Certificate, validUntil: today.AddDays(-200));
        archivedExpired.Archive();

        var longValid = NewDocument(name: "SOP EXPIRYTEST",
            type: DocType.Instruction, validUntil: today.AddDays(120));

        using (var scope = _fixture.CreateScope())
        {
            var repository = Repository(scope);
            await repository.AddAsync(expired);
            await repository.AddAsync(expiring);
            await repository.AddAsync(archivedExpired);
            await repository.AddAsync(longValid);
        }

        using (var scope = _fixture.CreateScope())
        {
            var rows = await Repository(scope).ListAsync(new DocumentFilter(
                Search: "EXPIRYTEST",
                ExpiresOnOrBefore: today.AddDays(30)));

            rows.Select(d => d.Id).Should().Equal(
                new[] { expired.Id, expiring.Id },
                "lejárt + ablakon belüli, archivált NÉLKÜL, legkorábbi érvényesség elöl");
        }
    }

    [Fact]
    public async Task SoftDeletedDocument_IsInvisible_OnEveryReadPath()
    {
        var document = NewDocument(name: "Törlendő dokumentum DELETETEST");

        using (var scope = _fixture.CreateScope())
        {
            await Repository(scope).AddAsync(document);
        }

        using (var scope = _fixture.CreateScope())
        {
            var repository = Repository(scope);
            var reloaded = await repository.GetByIdAsync(document.Id);
            reloaded!.SoftDelete();
            await repository.UpdateAsync(reloaded);
        }

        using (var scope = _fixture.CreateScope())
        {
            var repository = Repository(scope);
            (await repository.GetByIdAsync(document.Id)).Should().BeNull();
            (await repository.ListAsync(new DocumentFilter(Search: "DELETETEST")))
                .Should().BeEmpty();
        }
    }
}
