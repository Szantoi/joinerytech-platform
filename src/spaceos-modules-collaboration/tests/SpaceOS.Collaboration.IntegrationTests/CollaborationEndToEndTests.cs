using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F3/5 — the collaboration API answered by a real database.
/// </summary>
/// <remarks>
/// <para>
/// The F3/2–F3/4 endpoint tests run the real pipeline over in-memory repositories, so on that path
/// <b>no interceptor and no RLS policy has ever executed</b>. That is the same shape of gap the F2
/// slice found across the platform: six modules whose isolation suites set the session key by hand
/// and therefore never ran the thing they claim to cover. These tests close it for this module.
/// </para>
/// </remarks>
public sealed class CollaborationEndToEndTests : IAsyncLifetime
{
    private const string Schema = "public";

    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_e2e");

    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private readonly Guid _stranger = Guid.NewGuid();
    private readonly Guid _hostUser = Guid.NewGuid();
    private readonly Guid _guestUser = Guid.NewGuid();
    private readonly DateTimeOffset _now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private Guid _agreementId;
    private Guid _packageId;
    private Guid _revokedPackageId;
    private Guid _revokedAgreementId;
    private Guid _expiredPackageId;
    private string _termsHash = string.Empty;

    private CollaborationEndToEndHost _api = null!;

    private DbContextOptions<CollaborationDbContext> AdminOptions =>
        new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using (var db = new CollaborationDbContext(AdminOptions))
        {
            await db.Database.MigrateAsync();
            await SeedAsync(db);
        }

        await _fixture.CreateApplicationRoleAsync(Schema);

        // The application role is the point: NOSUPERUSER + NOBYPASSRLS, so the policies decide.
        _api = await CollaborationEndToEndHost.StartAsync(_fixture.AppConnectionString());
    }

    public async Task DisposeAsync()
    {
        await _api.DisposeAsync();
        await _fixture.DisposeAsync();
    }

    private async Task SeedAsync(CollaborationDbContext db)
    {
        var agreement = CollaborationAgreement.Create(_host, _guest, "Doorstar pilot", _now.AddDays(-10));
        agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), _now.AddDays(-9));
        agreement.AddGrant(CollaborationCapability.WorkPackageRead, Guid.NewGuid(), _now.AddDays(-9));
        agreement.Propose(_host, _hostUser, _now.AddDays(-8));

        var revision = AgreementTermsRevision.CreateDraft(
            agreement.Id, 1, """{"scope":"ajtolap","qty":50}""", _host, _hostUser, _now.AddDays(-9));

        var package = DelegatedWorkPackage.Create(
            agreement.Id, _host, _guest, "Ajtólap gyártás", "50 db", _now.AddDays(30), _now.AddDays(-7));
        package.Offer(_host, _hostUser, _now.AddDays(-6));

        // A second agreement whose grants were withdrawn — the fail-closed case, end to end.
        var revoked = CollaborationAgreement.Create(_host, _guest, "Lezárt alvállalkozás", _now.AddDays(-10));
        var revokedGrant = revoked.AddGrant(
            CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), _now.AddDays(-9));
        revokedGrant.Revoke("az alvállalkozás lezárult", _now.AddDays(-2));

        var revokedPackage = DelegatedWorkPackage.Create(
            revoked.Id, _host, _guest, "Régi munka", "10 db", _now.AddDays(30), _now.AddDays(-7));
        revokedPackage.Offer(_host, _hostUser, _now.AddDays(-6));

        // A third agreement whose grant simply LAPSED — the other half of fail-closed. Until now
        // only the revoked case had end-to-end evidence; the F3 doc kept the expiry item at `[~]`
        // for exactly this reason.
        var expired = CollaborationAgreement.Create(_host, _guest, "Lejárt keretszerződés", _now.AddDays(-10));
        expired.AddGrant(
            CollaborationCapability.WorkPackageExecute,
            Guid.NewGuid(),
            _now.AddDays(-9),
            expiresAtUtc: DateTimeOffset.UtcNow.AddMinutes(-1));

        var expiredPackage = DelegatedWorkPackage.Create(
            expired.Id, _host, _guest, "Tavalyi tétel", "5 db", _now.AddDays(30), _now.AddDays(-7));
        expiredPackage.Offer(_host, _hostUser, _now.AddDays(-6));

        db.Agreements.AddRange(agreement, revoked, expired);
        db.TermsRevisions.Add(revision);
        db.WorkPackages.AddRange(package, revokedPackage, expiredPackage);
        await db.SaveChangesAsync();

        _agreementId = agreement.Id;
        _packageId = package.Id;
        _revokedAgreementId = revoked.Id;
        _revokedPackageId = revokedPackage.Id;
        _expiredPackageId = expiredPackage.Id;
        _termsHash = revision.CanonicalHash;
    }

    private static string Url(string path) => $"{CollaborationApiExtensions.RouteBase}{path}";

    // ---------------------------------------------------------------------------------------
    // The isolation layer, exercised by an actual request
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task A_party_reads_its_own_package_through_the_whole_stack()
    {
        // This is the interceptor proof. Under NOBYPASSRLS the fail-closed policies return NO rows
        // when app.current_tenant_id is unset — so a 200 here cannot happen unless the shared
        // interceptor really wrote the session key on this request's connection.
        _api.As(_guest, _guestUser);

        var response = await _api.Client.GetAsync(Url($"/work-packages/{_packageId}"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(_packageId, document.RootElement.GetProperty("workPackageId").GetGuid());
    }

    [Fact]
    public async Task A_tenant_outside_the_collaboration_is_answered_the_same_as_for_nothing()
    {
        // The row exists and is perfectly readable to its two parties; to this tenant the database
        // does not return it at all.
        _api.As(_stranger, _hostUser);

        var package = await _api.Client.GetAsync(Url($"/work-packages/{_packageId}"));
        var agreement = await _api.Client.GetAsync(Url($"/agreements/{_agreementId}"));
        var absent = await _api.Client.GetAsync(Url($"/work-packages/{Guid.NewGuid()}"));

        Assert.Equal(HttpStatusCode.NotFound, package.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, agreement.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, absent.StatusCode);
    }

    [Fact]
    public async Task A_revoked_grant_closes_the_endpoint_on_real_data()
    {
        // B2B-02's open ticket, finally measured where it matters: the row is visible to the guest
        // (it is a party), and the withdrawn grant is what stops it.
        _api.As(_guest, _guestUser);

        var response = await _api.PostAsync(Url($"/work-packages/{_revokedPackageId}/accept"), ifMatch: 2);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        await using var db = new CollaborationDbContext(AdminOptions);
        var stored = await db.WorkPackages.SingleAsync(package => package.Id == _revokedPackageId);
        Assert.Equal(WorkPackageStatus.Offered, stored.Status);
    }

    // ---------------------------------------------------------------------------------------
    // The write really lands
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task A_transition_is_persisted_and_the_next_read_sees_it()
    {
        _api.As(_guest, _guestUser);

        var before = await _api.Client.GetAsync(Url($"/work-packages/{_packageId}"));
        var version = int.Parse(before.Headers.ETag!.Tag.Trim('"'));

        var accepted = await _api.PostAsync(Url($"/work-packages/{_packageId}/accept"), version);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

        // Read back through a SEPARATE connection: an aggregate that only moved in memory would
        // look exactly the same on the first read and different here.
        await using var db = new CollaborationDbContext(AdminOptions);
        var stored = await db.WorkPackages
            .Include(package => package.History)
            .SingleAsync(package => package.Id == _packageId);

        Assert.Equal(WorkPackageStatus.Accepted, stored.Status);
        Assert.Equal(version + 1, stored.RowVersion);
        Assert.Equal(_guest, stored.History[^1].ActorTenantId);
        Assert.Equal(_guestUser, stored.History[^1].ActorUserId);
    }

    [Fact]
    public async Task A_stale_tag_is_refused_before_anything_is_written()
    {
        _api.As(_guest, _guestUser);

        var response = await _api.PostAsync(Url($"/work-packages/{_packageId}/accept"), ifMatch: 1);

        Assert.Equal(HttpStatusCode.PreconditionFailed, response.StatusCode);

        await using var db = new CollaborationDbContext(AdminOptions);
        var stored = await db.WorkPackages.SingleAsync(package => package.Id == _packageId);
        Assert.Equal(WorkPackageStatus.Offered, stored.Status);
    }

    // ---------------------------------------------------------------------------------------
    // The durable pieces
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task A_keyed_retry_is_replayed_from_the_database()
    {
        _api.As(_guest, _guestUser);

        var current = await _api.Client.GetAsync(Url($"/work-packages/{_packageId}"));
        var version = int.Parse(current.Headers.ETag!.Tag.Trim('"'));

        var url = Url($"/work-packages/{_packageId}/reject");
        var body = () => new StringContent("""{"reason":"nem fér bele"}""", Encoding.UTF8, "application/json");

        var first = await _api.PostAsync(url, version, body(), idempotencyKey: "e2e-1");
        var second = await _api.PostAsync(url, version, body(), idempotencyKey: "e2e-1");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.True(second.Headers.Contains(CollaborationIdempotencyMiddleware.ReplayHeader));

        // The record is a row, not a memory of this process.
        await using var connection = new NpgsqlConnection(_fixture.AdminConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """SELECT count(*) FROM collaboration_idempotency_records WHERE "Key" = 'e2e-1';""",
            connection);

        var stored = (long)(await command.ExecuteScalarAsync())!;
        Assert.Equal(1L, stored);
    }

    [Fact]
    public async Task The_agreement_view_is_assembled_from_the_database()
    {
        _api.As(_host, _hostUser);

        // Bind the terms revision, so the view has a hash in force to report.
        var current = await _api.Client.GetAsync(Url($"/agreements/{_agreementId}"));
        var version = int.Parse(current.Headers.ETag!.Tag.Trim('"'));

        _api.As(_guest, _guestUser);
        var accepted = await _api.PostAsync(
            Url($"/agreements/{_agreementId}/accept"),
            version,
            new StringContent(
                $$"""{"termsRevisionId":"{{await TermsRevisionIdAsync()}}","acceptanceEvidence":"signed:doc-1"}""",
                Encoding.UTF8,
                "application/json"));

        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

        var view = await _api.Client.GetAsync(Url($"/agreements/{_agreementId}"));
        using var document = JsonDocument.Parse(await view.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal(_termsHash, root.GetProperty("currentRevisionHash").GetString());
        Assert.Equal(1, root.GetProperty("activeWorkPackageCount").GetInt32());
        Assert.Equal(nameof(AgreementStatus.Accepted), root.GetProperty("status").GetString());
    }

    private async Task<Guid> TermsRevisionIdAsync()
    {
        await using var db = new CollaborationDbContext(AdminOptions);
        return await db.TermsRevisions
            .Where(revision => revision.AgreementId == _agreementId)
            .Select(revision => revision.Id)
            .SingleAsync();
    }

    [Fact]
    public async Task A_non_party_write_with_a_wrong_tag_is_answered_404_not_412()
    {
        // B2B-10 F3X, point 1. Until now no end-to-end test sent a WRITE as a non-party: the
        // cross-tenant test only issued GETs, and the stale-tag test used a real party. The two
        // never met, so nothing here would have noticed if the precondition were checked first.
        //
        // ⚠ What this proves and what it does not: against this database the row is already
        // invisible to a stranger (RLS on the app role, plus the EF tenant filter), so the 404
        // arrives even if the ordering were wrong. The test therefore pins the CONTRACT at the
        // wire — a non-party learns nothing about versions — while the in-memory sibling
        // (CollaborationEndpointTests) is the one that actually fails when the order is reversed.
        _api.As(_stranger, _hostUser);

        var agreement = await _api.PostAsync(Url($"/agreements/{_agreementId}/propose"), ifMatch: 99);
        var package = await _api.PostAsync(Url($"/work-packages/{_packageId}/accept"), ifMatch: 99);

        Assert.Equal(HttpStatusCode.NotFound, agreement.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, package.StatusCode);
    }

    [Fact]
    public async Task An_expired_grant_closes_the_endpoint_just_as_a_revoked_one_does()
    {
        // The F3 acceptance list kept this at `[~]`: the expiry boundary was measured in memory
        // (and the root's M-A mutation bit there), but nothing had ever exercised it against a
        // real database through the API. Revoked and expired are different facts — one is an act,
        // the other is the clock — and fail-closed has to mean both.
        _api.As(_guest, _guestUser);

        var response = await _api.PostAsync(Url($"/work-packages/{_expiredPackageId}/accept"), ifMatch: 2);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        await using var db = new CollaborationDbContext(AdminOptions);
        var stored = await db.WorkPackages.SingleAsync(package => package.Id == _expiredPackageId);
        Assert.Equal(WorkPackageStatus.Offered, stored.Status);
    }
}
