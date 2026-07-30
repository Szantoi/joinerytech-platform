using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F3/4 — the two out-of-aggregate fields of the agreement view, read from a real database.
/// </summary>
/// <remarks>
/// The endpoint tests supply these through a stub, which can only show that the view is assembled.
/// Whether the queries select the right rows — and in particular whether "open work package" means
/// the same thing to SQL as it does to the aggregate — is decidable only here.
/// </remarks>
public sealed class AgreementViewQueryTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_agreement_view");
    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private readonly Guid _user = Guid.NewGuid();
    private readonly DateTimeOffset _now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private Guid _agreementId;
    private Guid _otherAgreementId;
    private Guid _revisionId;
    private string _revisionHash = string.Empty;

    private DbContextOptions<CollaborationDbContext> Options =>
        new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using var db = new CollaborationDbContext(Options);
        await db.Database.MigrateAsync();

        var agreement = CollaborationAgreement.Create(_host, _guest, "Doorstar pilot", _now.AddDays(-10));
        var other = CollaborationAgreement.Create(_host, _guest, "Másik megállapodás", _now.AddDays(-10));
        db.Agreements.AddRange(agreement, other);

        var revision = AgreementTermsRevision.CreateDraft(
            agreement.Id, 1, """{"scope":"ajtolap","qty":50}""", _host, _user, _now.AddDays(-9));
        db.TermsRevisions.Add(revision);

        _agreementId = agreement.Id;
        _otherAgreementId = other.Id;
        _revisionId = revision.Id;
        _revisionHash = revision.CanonicalHash;

        // Four packages on the agreement: two still in play, two closed. Plus one on the OTHER
        // agreement, which must not be counted — a query missing its agreement filter would pass
        // every other assertion here.
        db.WorkPackages.AddRange(
            Package(agreement.Id, WorkPackageStatus.Offered),
            Package(agreement.Id, WorkPackageStatus.InProgress),
            Package(agreement.Id, WorkPackageStatus.Completed),
            Package(agreement.Id, WorkPackageStatus.Cancelled),
            Package(other.Id, WorkPackageStatus.Offered));

        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private DelegatedWorkPackage Package(Guid agreementId, WorkPackageStatus status)
    {
        var package = DelegatedWorkPackage.Create(
            agreementId, _host, _guest, "Ajtólap", "50 db", _now.AddDays(30), _now.AddDays(-5));

        switch (status)
        {
            case WorkPackageStatus.Offered:
                package.Offer(_host, _user, _now.AddDays(-4));
                break;

            case WorkPackageStatus.InProgress:
                package.Offer(_host, _user, _now.AddDays(-4));
                package.Accept(_guest, _user, _now.AddDays(-3));
                package.StartProgress(_guest, _user, _now.AddDays(-2));
                break;

            case WorkPackageStatus.Completed:
                package.Offer(_host, _user, _now.AddDays(-4));
                package.Accept(_guest, _user, _now.AddDays(-3));
                package.StartProgress(_guest, _user, _now.AddDays(-2));
                package.Submit(_guest, _user, "DMS:1", _now.AddDays(-1));
                package.Complete(_host, _user, "QA:1", _now);
                break;

            case WorkPackageStatus.Cancelled:
                package.Cancel(_host, _user, "elállunk", _now.AddDays(-4));
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(status), status, "Not seeded by this fixture.");
        }

        return package;
    }

    [Fact]
    public async Task The_terms_hash_is_read_from_the_revision_that_is_in_force()
    {
        await using var db = new CollaborationDbContext(Options);
        var queries = new AgreementViewQueries(db);

        var hash = await queries.GetTermsHashAsync(_revisionId);

        Assert.Equal(_revisionHash, hash);
        Assert.NotEmpty(hash!);
    }

    [Fact]
    public async Task An_unknown_revision_has_no_hash_rather_than_an_empty_one()
    {
        await using var db = new CollaborationDbContext(Options);
        var queries = new AgreementViewQueries(db);

        Assert.Null(await queries.GetTermsHashAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Only_the_packages_still_in_play_are_counted()
    {
        await using var db = new CollaborationDbContext(Options);
        var queries = new AgreementViewQueries(db);

        var open = await queries.CountOpenWorkPackagesAsync(_agreementId);

        // Offered + InProgress. Completed and Cancelled are closed; the fifth package belongs to
        // another agreement.
        Assert.Equal(2, open);
    }

    [Fact]
    public async Task The_count_belongs_to_one_agreement_only()
    {
        await using var db = new CollaborationDbContext(Options);
        var queries = new AgreementViewQueries(db);

        Assert.Equal(1, await queries.CountOpenWorkPackagesAsync(_otherAgreementId));
        Assert.Equal(0, await queries.CountOpenWorkPackagesAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task What_SQL_calls_closed_is_what_the_aggregate_calls_closed()
    {
        // The two would drift the moment somebody adds a state and updates only one of them. Here
        // the domain's own list is the expectation, and the database is asked to agree.
        await using var db = new CollaborationDbContext(Options);

        var statuses = await db.WorkPackages
            .Where(package => package.AgreementId == _agreementId)
            .Select(package => package.Status)
            .ToListAsync();

        var openByDomain = statuses.Count(status => !DelegatedWorkPackage.ClosedStatuses.Contains(status));
        var openBySql = await new AgreementViewQueries(db).CountOpenWorkPackagesAsync(_agreementId);

        Assert.Equal(openByDomain, openBySql);
    }
}
