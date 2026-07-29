using Npgsql;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F2 — executable evidence that the two policy defects the alignment migration repairs
/// were real behaviours of PostgreSQL, not a reading of the SQL.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this file exists.</b> <see cref="CollaborationRlsProofTests"/> is green, but a green
/// suite only shows that the current state works — it does not show that the suite would have
/// caught the old state. Without that, "the policies were broken" stays an assertion by whoever
/// wrote the migration. Here the <i>pre-F2</i> policy shape is rebuilt on a scratch table and
/// its failure is asserted, so the defect is reproducible after the migration has shipped and
/// the original SQL is gone from the live schema.
/// </para>
/// <para>
/// The scratch table mirrors only what the two defects need: two tenant columns and a status.
/// It is deliberately not the real table — this file is about the shape of the policy
/// expression, and coupling it to the production schema would make it fail for unrelated reasons
/// later.
/// </para>
/// </remarks>
public sealed class LegacyPolicyDefectTests : IAsyncLifetime
{
    private const string LegacyTenant = "current_setting('app.current_tenant_id', true)::uuid";
    private const string BaselineTenant = "NULLIF(current_setting('app.current_tenant_id', true), '')::uuid";

    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_legacy_policy");
    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private readonly Guid _rowId = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using var admin = new NpgsqlConnection(_fixture.AdminConnectionString);
        await admin.OpenAsync();

        await ExecAsync(admin, """
            CREATE TABLE scratch_grants (
                "Id" uuid PRIMARY KEY,
                "HostTenantId" uuid NOT NULL,
                "GuestTenantId" uuid NOT NULL,
                "Status" integer NOT NULL
            );
            ALTER TABLE scratch_grants ENABLE ROW LEVEL SECURITY;
            ALTER TABLE scratch_grants FORCE ROW LEVEL SECURITY;
            """);

        await _fixture.CreateApplicationRoleAsync("public");

        await using var seed = admin.CreateCommand();
        seed.CommandText = """
            INSERT INTO scratch_grants ("Id", "HostTenantId", "GuestTenantId", "Status")
            VALUES (@id, @host, @guest, 0)
            """;
        seed.Parameters.AddWithValue("id", _rowId);
        seed.Parameters.AddWithValue("host", _host);
        seed.Parameters.AddWithValue("guest", _guest);
        await seed.ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    [Fact]
    public async Task The_legacy_expression_throws_a_cast_error_when_the_pool_reset_value_is_in_the_key()
    {
        await ApplyPolicyAsync($"""("HostTenantId" = {LegacyTenant} OR "GuestTenantId" = {LegacyTenant})""");

        await using var connection = await OpenAppConnectionAsync(tenantId: null);
        await using var command = connection.CreateCommand();
        command.CommandText = """SELECT count(*) FROM scratch_grants""";

        var failure = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteScalarAsync());

        // 22P02 = invalid_text_representation, i.e. ''::uuid. This is what every Collaboration
        // query would have done the moment the module was wired to the shared interceptor.
        Assert.Equal("22P02", failure.SqlState);
    }

    [Fact]
    public async Task The_baseline_expression_answers_the_same_case_with_no_rows()
    {
        await ApplyPolicyAsync($"""("HostTenantId" = {BaselineTenant} OR "GuestTenantId" = {BaselineTenant})""");

        await using var connection = await OpenAppConnectionAsync(tenantId: null);
        await using var command = connection.CreateCommand();
        command.CommandText = """SELECT count(*) FROM scratch_grants""";

        Assert.Equal(0L, await command.ExecuteScalarAsync());
    }

    [Fact]
    public async Task The_legacy_status_filter_makes_revocation_impossible()
    {
        // A policy with no WITH CHECK applies its USING expression to the row being written, so
        // `AND "Status" = 0` silently turned "only active grants are visible" into "a grant may
        // never stop being active".
        // The predicate must match the row as it is (Active = 0) so that the row IS visible and
        // the UPDATE really reaches it; the failure then comes from the NEW value (Revoked = 1),
        // which is the defect. A predicate the stored row already fails would only produce
        // "0 rows affected" and would prove nothing.
        await ApplyPolicyAsync(
            $"""(("HostTenantId" = {BaselineTenant} OR "GuestTenantId" = {BaselineTenant}) AND "Status" = 0)""");

        await using var connection = await OpenAppConnectionAsync(_host);
        await using var command = connection.CreateCommand();
        command.CommandText = """UPDATE scratch_grants SET "Status" = 1 WHERE "Id" = @id""";
        command.Parameters.AddWithValue("id", _rowId);

        var failure = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync());

        // 42501 = insufficient_privilege: "new row violates row-level security policy".
        Assert.Equal("42501", failure.SqlState);
    }

    [Fact]
    public async Task Isolation_without_the_status_filter_lets_the_same_revocation_through()
    {
        await ApplyPolicyAsync($"""("HostTenantId" = {BaselineTenant} OR "GuestTenantId" = {BaselineTenant})""");

        // Same tenant, same row, same transition (Active -> Revoked) as the test above; the only
        // difference is that isolation no longer carries a business-state clause.
        await using var connection = await OpenAppConnectionAsync(_host);
        await using var command = connection.CreateCommand();
        command.CommandText = """UPDATE scratch_grants SET "Status" = 1 WHERE "Id" = @id""";
        command.Parameters.AddWithValue("id", _rowId);

        Assert.Equal(1, await command.ExecuteNonQueryAsync());
    }

    /// <summary>Replaces the scratch policy; each test states the exact shape it is measuring.</summary>
    private async Task ApplyPolicyAsync(string predicate)
    {
        await using var admin = new NpgsqlConnection(_fixture.AdminConnectionString);
        await admin.OpenAsync();
        await ExecAsync(admin, $"""
            DROP POLICY IF EXISTS scratch_policy ON scratch_grants;
            CREATE POLICY scratch_policy ON scratch_grants USING ({predicate});
            """);
    }

    private async Task<NpgsqlConnection> OpenAppConnectionAsync(Guid? tenantId)
    {
        var connection = new NpgsqlConnection(_fixture.AppConnectionString());
        await connection.OpenAsync();
        await NonSuperuserRlsFixture.SetTenantAsync(connection, tenantId);
        return connection;
    }

    private static async Task ExecAsync(NpgsqlConnection connection, string sql)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync();
    }
}
