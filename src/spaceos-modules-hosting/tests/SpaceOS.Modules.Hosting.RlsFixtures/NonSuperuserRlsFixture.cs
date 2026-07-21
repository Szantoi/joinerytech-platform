using Npgsql;
using Testcontainers.PostgreSql;

namespace SpaceOS.Modules.Hosting.RlsFixtures;

/// <summary>
/// STAB-RLS-PROOF shared Testcontainers fixture: proves FORCE RLS is real enforcement, not a
/// catalog setting, by running every assertion through a genuine <c>NOSUPERUSER</c> /
/// <c>NOBYPASSRLS</c> PostgreSQL application role — never the migrator/superuser.
/// </summary>
/// <remarks>
/// <para>
/// Usage per module test class: start the container, run the module's own EF migrations
/// against <see cref="AdminConnectionString"/> (the Testcontainers-provided role, which IS a
/// superuser — that's fine, it's the migrator, and it is NEVER used for an RLS assertion),
/// then call <see cref="CreateApplicationRoleAsync"/> to provision the non-superuser role and
/// grant it exactly the DML privileges a deployed module host would need. From then on every
/// test in the module MUST use <see cref="AppConnectionString"/> — the whole point of this
/// fixture is that superusers always bypass RLS regardless of <c>FORCE</c>
/// (ADR-062), so an assertion made through the migrator role would trivially pass even if the
/// policy were broken or absent.
/// </para>
/// <para>
/// One instance owns one PostgreSQL Testcontainer; module test classes bind it as an
/// <c>IAsyncLifetime</c>/collection fixture the same way the pre-existing per-module Postgres
/// fixtures do (see e.g. <c>EhsPostgresFixture</c>), so this file adds a capability rather than
/// replacing the existing container-sharing pattern.
/// </para>
/// </remarks>
public sealed class NonSuperuserRlsFixture : IAsyncDisposable
{
    /// <summary>The application role name every module's RLS-proof tests connect as.</summary>
    public const string AppRoleName = "spaceos_rls_proof_app";

    private const string AppRolePassword = "rls-proof-app-pwd-01";

    private readonly PostgreSqlContainer _container;

    /// <summary>Creates the fixture. Call <see cref="StartAsync"/> before using it.</summary>
    /// <param name="database">The Postgres database name for this module's isolated container.</param>
    public NonSuperuserRlsFixture(string database)
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase(database)
            // Testcontainers' postgres image creates this user via initdb -> it IS a
            // superuser. That is intentional here: it is the migrator/admin role (Preflight +
            // Megvalósítás step 1 of STAB-RLS-PROOF), never used for an RLS assertion.
            .WithUsername("rls_migrator")
            .WithPassword("rls-migrator-pwd-01")
            .Build();
    }

    /// <summary>Starts the container. Idempotent per fixture instance.</summary>
    public Task StartAsync() => _container.StartAsync();

    /// <summary>
    /// The migrator/admin connection string (Postgres superuser). Use this ONLY to run EF
    /// migrations / DDL and to provision the application role. Never use it for an RLS
    /// assertion — superusers bypass RLS unconditionally.
    /// </summary>
    public string AdminConnectionString => _container.GetConnectionString();

    /// <summary>
    /// The application-role connection string — <c>NOSUPERUSER</c>, <c>NOBYPASSRLS</c>. Every
    /// tenant-isolation assertion in the RLS-proof suite must go through this connection string.
    /// </summary>
    /// <param name="maxPoolSize">
    /// Pass a small value (e.g. 1) to deterministically force physical-connection reuse for the
    /// connection-pool-reuse / no-cross-tenant-leakage test (Megvalósítás step 3, last clause).
    /// </param>
    public string AppConnectionString(int maxPoolSize = 20)
    {
        var builder = new NpgsqlConnectionStringBuilder(_container.GetConnectionString())
        {
            Username = AppRoleName,
            Password = AppRolePassword,
            MaxPoolSize = maxPoolSize,
            MinPoolSize = 0,
        };
        return builder.ConnectionString;
    }

    /// <summary>
    /// Creates (if missing) the <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role and
    /// grants it CONNECT + schema USAGE + table DML + sequence USAGE on every listed schema.
    /// Must run AFTER the module's migrations have created the schema/tables (as the migrator
    /// role) — granting on objects that do not exist yet is a no-op for <c>ALL TABLES IN
    /// SCHEMA</c>.
    /// </summary>
    public async Task CreateApplicationRoleAsync(params string[] schemas)
    {
        await using var admin = new NpgsqlConnection(AdminConnectionString);
        await admin.OpenAsync().ConfigureAwait(false);

        await ExecAsync(admin, $"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{AppRoleName}') THEN
                    CREATE ROLE {AppRoleName} LOGIN PASSWORD '{AppRolePassword}'
                        NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
                END IF;
            END
            $$;
            """).ConfigureAwait(false);

        var dbName = new NpgsqlConnectionStringBuilder(AdminConnectionString).Database;
        await ExecAsync(admin, $"GRANT CONNECT ON DATABASE \"{dbName}\" TO {AppRoleName};").ConfigureAwait(false);

        foreach (var schema in schemas)
        {
            await ExecAsync(admin, $"GRANT USAGE ON SCHEMA {schema} TO {AppRoleName};").ConfigureAwait(false);
            await ExecAsync(admin, $"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA {schema} TO {AppRoleName};").ConfigureAwait(false);
            await ExecAsync(admin, $"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA {schema} TO {AppRoleName};").ConfigureAwait(false);
            await ExecAsync(admin, $"GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA {schema} TO {AppRoleName};").ConfigureAwait(false);
        }
    }

    /// <summary>
    /// Reads <c>rolsuper</c>/<c>rolbypassrls</c> for <see cref="AppRoleName"/> straight from
    /// <c>pg_roles</c> (Megvalósítás step 2). Both must be <c>false</c> for the RLS proof to be
    /// meaningful.
    /// </summary>
    public async Task<(bool RolSuper, bool RolBypassRls)> ReadApplicationRolePropertiesAsync()
    {
        await using var admin = new NpgsqlConnection(AdminConnectionString);
        await admin.OpenAsync().ConfigureAwait(false);
        await using var cmd = admin.CreateCommand();
        cmd.CommandText = "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = @role";
        cmd.Parameters.AddWithValue("role", AppRoleName);
        await using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException($"Role '{AppRoleName}' was not found in pg_roles.");
        return (reader.GetBoolean(0), reader.GetBoolean(1));
    }

    /// <summary>
    /// Reads <c>relrowsecurity</c>/<c>relforcerowsecurity</c> from <c>pg_class</c> for every
    /// named table in <paramref name="schema"/> (Megvalósítás step 5 — the catalog-level proof
    /// that FORCE RLS is actually set, independent of whether the policy behaves correctly).
    /// </summary>
    public async Task<IReadOnlyList<CatalogRlsState>> ReadForceRlsCatalogAsync(string schema, params string[] tables)
    {
        await using var admin = new NpgsqlConnection(AdminConnectionString);
        await admin.OpenAsync().ConfigureAwait(false);

        var results = new List<CatalogRlsState>();
        foreach (var table in tables)
        {
            await using var cmd = admin.CreateCommand();
            cmd.CommandText = """
                SELECT c.relrowsecurity, c.relforcerowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = @schema AND c.relname = @table
                """;
            cmd.Parameters.AddWithValue("schema", schema);
            cmd.Parameters.AddWithValue("table", table);
            await using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);
            if (!await reader.ReadAsync().ConfigureAwait(false))
                throw new InvalidOperationException($"Table '{schema}.{table}' was not found in pg_class.");
            results.Add(new CatalogRlsState(table, reader.GetBoolean(0), reader.GetBoolean(1)));
        }
        return results;
    }

    /// <summary>
    /// Sets (or clears, when <paramref name="tenantId"/> is <c>null</c>) the
    /// <c>app.current_tenant_id</c> session GUC on an already-open connection, exactly mirroring
    /// <c>SpaceOsTenantSessionInterceptor</c>'s parameterised <c>set_config</c> call — including
    /// the "no context" case, which the RLS policies see as SQL NULL via
    /// <c>NULLIF(current_setting(...), '')</c> (fail-closed: zero rows, not an error).
    /// </summary>
    public static async Task SetTenantAsync(NpgsqlConnection connection, Guid? tenantId)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT set_config('app.current_tenant_id', @value, false)";
        cmd.Parameters.AddWithValue("value", tenantId?.ToString() ?? string.Empty);
        await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
    }

    /// <summary>Disposes the underlying Testcontainer. Always awaited from a <c>finally</c>/<c>DisposeAsync</c> path by callers.</summary>
    public async ValueTask DisposeAsync() => await _container.DisposeAsync().ConfigureAwait(false);

    private static async Task ExecAsync(NpgsqlConnection connection, string sql)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
    }
}

/// <summary>One row of the <c>pg_class</c> FORCE-RLS catalog assertion (Megvalósítás step 5).</summary>
/// <param name="Table">The table name as it exists in the schema.</param>
/// <param name="RelRowSecurity">Whether <c>ENABLE ROW LEVEL SECURITY</c> is set.</param>
/// <param name="RelForceRowSecurity">Whether <c>FORCE ROW LEVEL SECURITY</c> is set.</param>
public sealed record CatalogRlsState(string Table, bool RelRowSecurity, bool RelForceRowSecurity);
