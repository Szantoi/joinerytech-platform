using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Persistence;

/// <summary>
/// Pins <see cref="NonSuperuserRlsFixture.SetTenantAsync"/> — the hand-written mirror every
/// module's RLS proof runs through — to the real <see cref="SpaceOsTenantSessionInterceptor"/>,
/// against one genuine PostgreSQL session.
/// </summary>
/// <remarks>
/// <para>
/// <b>The gap this closes.</b> Two halves were already measured, and neither joins them:
/// </para>
/// <list type="bullet">
/// <item><description>
/// <see cref="SpaceOsTenantSessionInterceptorTests"/> proves the interceptor builds the right
/// command — but against a <c>FakeDbConnection</c>, so it never observes a database.
/// </description></item>
/// <item><description>
/// The seven modules' <c>RlsNonSuperuserIsolationTests</c> prove the policies behave correctly for
/// a given session key — but they set that key themselves, via the fixture's
/// <see cref="NonSuperuserRlsFixture.SetTenantAsync"/>, whose own documentation says it is
/// "exactly mirroring" the interceptor.
/// </description></item>
/// </list>
/// <para>
/// A mirror stays green when the original breaks. Rename the GUC, flip the <c>set_config</c> scope
/// flag, or stop resetting on close, and every one of those suites still passes — because none of
/// them runs the interceptor. This file is the join: it drives the interceptor and the mirror
/// through the same connection and asserts the database cannot tell them apart.
/// </para>
/// <para>
/// <b>Why the assertions read the GUC back instead of inspecting the command.</b> Comparing command
/// text would be a second mirror — it would pass whenever the two agree, including when both are
/// wrong. What matters is the state PostgreSQL is left in, so every case reads
/// <c>current_setting</c> from the live session.
/// </para>
/// <para>
/// Runs as the <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role, i.e. the connection the
/// modules actually assert through — no tables are needed, because only the session key is in the
/// frame here, not any policy.
/// </para>
/// <para>
/// <b>What these four cases uniquely cover — measured, not asserted.</b> Two mutations are caught
/// by the pre-existing unit test as well (renaming the key parameter; flipping the scope flag),
/// because it compares the command text literally. The mutation that only this file catches is a
/// change to <see cref="TenancyDefaults.PgSessionKey"/> itself — say to a name PostgreSQL rejects
/// as an unrecognised configuration parameter. All four cases here fail; <b>zero</b> existing tests
/// do, because the unit test and every module mirror compare the interceptor against that same
/// constant, so both sides move together. That single edit would break RLS at runtime in all seven
/// modules with the whole suite green.
/// </para>
/// </remarks>
public sealed class InterceptorMirrorConformanceTests : IAsyncLifetime
{
    private static readonly Guid TenantA = Guid.Parse("aaaaaaaa-1111-1111-1111-111111111111");

    private readonly NonSuperuserRlsFixture _fixture = new("hosting_interceptor_mirror");

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();
        await _fixture.CreateApplicationRoleAsync("public");
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private sealed class NoTenantContext : ITenantContext
    {
        public bool HasTenant => false;
        public Guid TenantId => throw new InvalidOperationException("No tenant in scope.");
    }

    /// <summary>The interceptor as a host builds it, with no HTTP context — i.e. background work.</summary>
    private static SpaceOsTenantSessionInterceptor BackgroundInterceptor(ITenantContext tenantContext)
        => new(tenantContext, new Microsoft.AspNetCore.Http.HttpContextAccessor(), NullLogger<SpaceOsTenantSessionInterceptor>.Instance);

    // The event-data constructors take a DbConnection, so a real NpgsqlConnection goes in exactly
    // where the existing unit test passes its fake — the interceptor code path is identical.
    private static ConnectionEndEventData OpenedEventData(NpgsqlConnection connection)
        => new(null!, null!, connection, null, Guid.NewGuid(), false, DateTimeOffset.UtcNow, TimeSpan.Zero);

    private static ConnectionEventData ClosingEventData(NpgsqlConnection connection)
        => new(null!, null!, connection, null, Guid.NewGuid(), false, DateTimeOffset.UtcNow);

    private async Task<NpgsqlConnection> OpenAppConnectionAsync()
    {
        var connection = new NpgsqlConnection(_fixture.AppConnectionString());
        await connection.OpenAsync();
        return connection;
    }

    /// <summary>
    /// Reads the session key as the RLS policies see it. <c>current_setting(..., true)</c> is the
    /// missing-ok form: an unset GUC comes back as <c>null</c> rather than raising, which is the
    /// same distinction the policies make via <c>NULLIF(current_setting(...), '')</c>.
    /// </summary>
    private static async Task<string?> ReadSessionKeyAsync(NpgsqlConnection connection)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SELECT current_setting('{TenancyDefaults.PgSessionKey}', true)";
        var value = await cmd.ExecuteScalarAsync();
        return value is DBNull or null ? null : (string)value;
    }

    [Fact]
    public async Task Interceptor_and_mirror_leave_the_SAME_session_key_for_a_resolved_tenant()
    {
        string? viaInterceptor;
        await using (var connection = await OpenAppConnectionAsync())
        {
            await BackgroundInterceptor(new FixedTenantContext(TenantA))
                .ConnectionOpenedAsync(connection, OpenedEventData(connection));
            viaInterceptor = await ReadSessionKeyAsync(connection);
        }

        string? viaMirror;
        await using (var connection = await OpenAppConnectionAsync())
        {
            await NonSuperuserRlsFixture.SetTenantAsync(connection, TenantA);
            viaMirror = await ReadSessionKeyAsync(connection);
        }

        // Both must equal the tenant id — asserting only equality would pass if BOTH were empty.
        Assert.Equal(TenantA.ToString(), viaInterceptor);
        Assert.Equal(viaInterceptor, viaMirror);
    }

    [Fact]
    public async Task Interceptor_and_mirror_agree_on_the_fail_closed_no_tenant_value()
    {
        string? viaInterceptor;
        await using (var connection = await OpenAppConnectionAsync())
        {
            await BackgroundInterceptor(new NoTenantContext())
                .ConnectionOpenedAsync(connection, OpenedEventData(connection));
            viaInterceptor = await ReadSessionKeyAsync(connection);
        }

        string? viaMirror;
        await using (var connection = await OpenAppConnectionAsync())
        {
            await NonSuperuserRlsFixture.SetTenantAsync(connection, null);
            viaMirror = await ReadSessionKeyAsync(connection);
        }

        // Empty string, not null and not a tenant: the policies turn '' into SQL NULL and return
        // zero rows. A non-empty value here would be a tenant leak; a raised error would be a
        // fail-open in disguise, because callers retry.
        Assert.Equal(string.Empty, viaInterceptor);
        Assert.Equal(viaInterceptor, viaMirror);
    }

    [Fact]
    public async Task The_session_key_SURVIVES_a_rolled_back_transaction()
    {
        // `set_config(key, value, false)` is session-scoped; `true` would be transaction-local,
        // and the key would evaporate at the end of the first transaction — mid-request, RLS
        // silently starts returning zero rows.
        //
        // MEASURED, so as not to overstate: flipping that flag ALSO fails the existing
        // FakeDbConnection test, because that one asserts the command text literally. What this
        // case adds is that it pins the CONSEQUENCE rather than the spelling: it still guards the
        // semantics after any legitimate rewrite of the command, where a text assertion would
        // either break spuriously or quietly stop covering anything.
        await using var connection = await OpenAppConnectionAsync();
        await BackgroundInterceptor(new FixedTenantContext(TenantA))
            .ConnectionOpenedAsync(connection, OpenedEventData(connection));

        await using (var transaction = await connection.BeginTransactionAsync())
        {
            Assert.Equal(TenantA.ToString(), await ReadSessionKeyAsync(connection));
            await transaction.RollbackAsync();
        }

        Assert.Equal(TenantA.ToString(), await ReadSessionKeyAsync(connection));
    }

    [Fact]
    public async Task Closing_clears_the_key_so_a_pooled_connection_cannot_carry_a_tenant_over()
    {
        await using var connection = await OpenAppConnectionAsync();
        var interceptor = BackgroundInterceptor(new FixedTenantContext(TenantA));

        await interceptor.ConnectionOpenedAsync(connection, OpenedEventData(connection));
        Assert.Equal(TenantA.ToString(), await ReadSessionKeyAsync(connection));

        await interceptor.ConnectionClosingAsync(connection, ClosingEventData(connection), default);

        // Still the same physical session here, so this reads exactly what the next borrower of a
        // pooled connection would inherit.
        Assert.Equal(string.Empty, await ReadSessionKeyAsync(connection));
    }
}
