using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F2 — the Collaboration tenant-isolation proof, run against a real PostgreSQL through a
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> role.
/// </summary>
/// <remarks>
/// <para>
/// This suite exists because B2B-02's cross-tenant tests run on the EF <c>InMemory</c> provider,
/// where they write their own <c>Where(...)</c> clause and then assert that it filtered. Such a
/// test passes whether or not the module has any isolation at all, and it cannot touch the three
/// things B2B-02 claims: SQL-level policies, a non-superuser role, and connection pooling.
/// Every assertion below therefore goes through <see cref="NonSuperuserRlsFixture.AppConnectionString"/>
/// and raw SQL — the database decides, not a LINQ predicate written by the test.
/// </para>
/// <para>
/// Seeding is done through the migrator connection on purpose: it is a superuser and bypasses
/// RLS, which is exactly what a fixture needs in order to place rows that the application role
/// must then be unable to see.
/// </para>
/// </remarks>
public sealed class CollaborationRlsProofTests : IAsyncLifetime
{
    private const string Schema = "public";

    private static readonly string[] TenantScopedTables =
    [
        "collaboration_agreements",
        "collaboration_participant_grants",
        "collaboration_work_packages",
        "collaboration_work_package_history",
        "collaboration_terms_revisions",
        "collaboration_acceptance_evidences",
        "collaboration_outbox",
        "collaboration_inbox",
    ];

    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_rls_proof");

    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private readonly Guid _stranger = Guid.NewGuid();
    private Guid _sharedAgreementId;
    private Guid _foreignAgreementId;
    private Guid _grantId;

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        // Applying the module's own migrations is itself part of the proof: the baseline
        // alignment migration has to run on a clean database before anything can be asserted.
        var options = new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;
        await using (var db = new CollaborationDbContext(options))
        {
            await db.Database.MigrateAsync();
        }

        await _fixture.CreateApplicationRoleAsync(Schema);
        await SeedAsync();
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    [Fact]
    public async Task The_application_role_is_neither_superuser_nor_rls_bypassing()
    {
        // Without this, every other test in the file would be worthless: a superuser sees all
        // rows regardless of FORCE RLS, so the suite would pass with the policies dropped.
        var (rolSuper, rolBypassRls) = await _fixture.ReadApplicationRolePropertiesAsync();

        Assert.False(rolSuper);
        Assert.False(rolBypassRls);
    }

    [Fact]
    public async Task Every_collaboration_table_has_row_security_enabled_and_forced()
    {
        var catalog = await _fixture.ReadForceRlsCatalogAsync(Schema, TenantScopedTables);

        Assert.All(catalog, state =>
        {
            Assert.True(state.RelRowSecurity, $"{state.Table}: ENABLE ROW LEVEL SECURITY is missing.");
            Assert.True(state.RelForceRowSecurity, $"{state.Table}: FORCE ROW LEVEL SECURITY is missing.");
        });
    }

    [Fact]
    public async Task Both_participants_see_the_shared_agreement_and_neither_sees_the_other_ones()
    {
        await using var connection = await OpenAppConnectionAsync(_host);
        var hostVisible = await ReadAgreementIdsAsync(connection);

        Assert.Contains(_sharedAgreementId, hostVisible);
        Assert.DoesNotContain(_foreignAgreementId, hostVisible);

        await NonSuperuserRlsFixture.SetTenantAsync(connection, _guest);
        var guestVisible = await ReadAgreementIdsAsync(connection);

        Assert.Contains(_sharedAgreementId, guestVisible);
        Assert.DoesNotContain(_foreignAgreementId, guestVisible);
    }

    [Fact]
    public async Task A_third_tenant_sees_nothing_at_all()
    {
        await using var connection = await OpenAppConnectionAsync(_stranger);

        Assert.Empty(await ReadAgreementIdsAsync(connection));
    }

    [Fact]
    public async Task An_unset_tenant_context_returns_no_rows_rather_than_failing_with_a_cast_error()
    {
        // The regression this whole migration was written for. The interceptor writes '' into
        // app.current_tenant_id when a pooled connection is released, and ''::uuid is NOT NULL on
        // PostgreSQL — it is "invalid input syntax for type uuid". Before the baseline alignment
        // this call threw; fail-closed means an empty result, not an exception.
        await using var connection = await OpenAppConnectionAsync(null);

        var visible = await ReadAgreementIdsAsync(connection);

        Assert.Empty(visible);
    }

    [Fact]
    public async Task A_pooled_connection_does_not_carry_the_previous_tenant_into_the_next_use()
    {
        // MaxPoolSize=1 forces the second open to reuse the same physical connection, which is
        // the only way to observe a leaked session GUC deterministically.
        var connectionString = _fixture.AppConnectionString(maxPoolSize: 1);

        await using (var first = new NpgsqlConnection(connectionString))
        {
            await first.OpenAsync();
            await NonSuperuserRlsFixture.SetTenantAsync(first, _host);
            Assert.NotEmpty(await ReadAgreementIdsAsync(first));

            // What the interceptor does in ConnectionClosing.
            await NonSuperuserRlsFixture.SetTenantAsync(first, null);
        }

        await using var second = new NpgsqlConnection(connectionString);
        await second.OpenAsync();

        Assert.Empty(await ReadAgreementIdsAsync(second));
    }

    [Fact]
    public async Task A_tenant_cannot_write_an_agreement_that_belongs_to_two_other_tenants()
    {
        // WITH CHECK, which the pre-F2 policies did not spell out at all.
        await using var connection = await OpenAppConnectionAsync(_host);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO collaboration_agreements
                ("Id", "HostTenantId", "GuestTenantId", "Title", "Status", "CreatedAtUtc")
            VALUES (@id, @a, @b, 'Smuggled', 0, now())
            """;
        command.Parameters.AddWithValue("id", Guid.NewGuid());
        command.Parameters.AddWithValue("a", _stranger);
        command.Parameters.AddWithValue("b", _guest);

        var failure = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync());

        Assert.Equal("42501", failure.SqlState);
    }

    [Fact]
    public async Task A_participant_grant_can_be_revoked()
    {
        // The defect the F2 migration removes: the old policy carried `AND "Status" = 0` in its
        // USING clause and had no WITH CHECK, so PostgreSQL applied that same predicate to the
        // updated row — the row produced by Revoke() (status != Active) was refused. Revocation
        // is a security operation; a policy that blocks it fails closed in the wrong direction.
        await using var connection = await OpenAppConnectionAsync(_host);

        await using var update = connection.CreateCommand();
        update.CommandText = """
            UPDATE collaboration_participant_grants
               SET "Status" = 1, "RevokedAtUtc" = now(), "RevocationReason" = 'F2 proof'
             WHERE "Id" = @id
            """;
        update.Parameters.AddWithValue("id", _grantId);

        Assert.Equal(1, await update.ExecuteNonQueryAsync());

        await using var verify = connection.CreateCommand();
        verify.CommandText = """SELECT "Status" FROM collaboration_participant_grants WHERE "Id" = @id""";
        verify.Parameters.AddWithValue("id", _grantId);

        // Still visible after revocation: the row must remain readable for the audit trail, and
        // "only active grants confer capability" is an authorization question, not a policy one.
        Assert.Equal(1, await verify.ExecuteScalarAsync());
    }

    [Fact]
    public async Task A_child_row_follows_the_tenancy_of_its_parent_agreement()
    {
        await using var connection = await OpenAppConnectionAsync(_host);

        await using var command = connection.CreateCommand();
        command.CommandText = """SELECT count(*) FROM collaboration_terms_revisions""";
        var visibleToParticipant = (long)(await command.ExecuteScalarAsync())!;

        await NonSuperuserRlsFixture.SetTenantAsync(connection, _stranger);
        var visibleToStranger = (long)(await command.ExecuteScalarAsync())!;

        Assert.Equal(1, visibleToParticipant);
        Assert.Equal(0, visibleToStranger);
    }

    private async Task<NpgsqlConnection> OpenAppConnectionAsync(Guid? tenantId)
    {
        var connection = new NpgsqlConnection(_fixture.AppConnectionString());
        await connection.OpenAsync();
        await NonSuperuserRlsFixture.SetTenantAsync(connection, tenantId);
        return connection;
    }

    private static async Task<List<Guid>> ReadAgreementIdsAsync(NpgsqlConnection connection)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """SELECT "Id" FROM collaboration_agreements""";

        var ids = new List<Guid>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            ids.Add(reader.GetGuid(0));
        return ids;
    }

    private async Task SeedAsync()
    {
        _sharedAgreementId = Guid.NewGuid();
        _foreignAgreementId = Guid.NewGuid();
        _grantId = Guid.NewGuid();

        await using var admin = new NpgsqlConnection(_fixture.AdminConnectionString);
        await admin.OpenAsync();

        await using var command = admin.CreateCommand();
        command.CommandText = """
            INSERT INTO collaboration_agreements
                ("Id", "HostTenantId", "GuestTenantId", "Title", "Status", "CreatedAtUtc")
            VALUES (@shared, @host, @guest, 'Shared', 0, now()),
                   (@foreign, @strangerHost, @strangerGuest, 'Foreign', 0, now());

            INSERT INTO collaboration_participant_grants
                ("Id", "AgreementId", "HostTenantId", "GuestTenantId",
                 "CapabilityScope", "TermsRevisionId", "Status", "GrantedAtUtc")
            VALUES (@grant, @shared, @host, @guest, 'production.cutting', @terms, 0, now());

            INSERT INTO collaboration_terms_revisions
                ("Id", "AgreementId", "RevisionNumber", "ContentJson", "CanonicalHash",
                 "Status", "CreatedAtUtc", "CreatedByTenantId", "CreatedByUserId")
            VALUES (@terms, @shared, 1, '{}'::jsonb, @hash, 0, now(), @host, @user);
            """;
        command.Parameters.AddWithValue("shared", _sharedAgreementId);
        command.Parameters.AddWithValue("foreign", _foreignAgreementId);
        command.Parameters.AddWithValue("grant", _grantId);
        command.Parameters.AddWithValue("terms", Guid.NewGuid());
        command.Parameters.AddWithValue("host", _host);
        command.Parameters.AddWithValue("guest", _guest);
        command.Parameters.AddWithValue("user", Guid.NewGuid());
        command.Parameters.AddWithValue("hash", new string('a', 64));

        // Two tenants that are neither _host nor _guest, so the foreign row is invisible to both
        // participants and to the stranger used in the negative tests.
        command.Parameters.AddWithValue("strangerHost", Guid.NewGuid());
        command.Parameters.AddWithValue("strangerGuest", Guid.NewGuid());

        await command.ExecuteNonQueryAsync();
    }
}
