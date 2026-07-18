using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Persistence;

/// <summary>
/// The single, shared RLS session interceptor for all JoineryTech module hosts (ADR-062).
/// Sets the PostgreSQL session variable <c>app.current_tenant_id</c> on every opened
/// connection via a parameterised <c>set_config</c> call, and resets it before the
/// connection returns to the pool.
/// </summary>
/// <remarks>
/// <para>
/// Replaces the five per-module interceptor copies that had three divergent behaviours
/// (throw / silently swallow / direct <c>set_config</c>). The contract here is the
/// ADR-062 one-liner: <b>errors are NEVER swallowed.</b> A missing RLS function, a broken
/// connection or a missing tenant on an authenticated request all fail loudly instead of
/// silently serving another tenant's rows.
/// </para>
/// <para>
/// Kernel parity (<c>TenantSessionInterceptor</c>): parameterised <c>set_config</c>
/// (no SQL built from claim values), session scope (<c>is_local=false</c> — a
/// <c>SET LOCAL</c> in <c>ConnectionOpened</c> would be a transactionless no-op, BE-P15-03),
/// and pool reset on close.
/// </para>
/// <para>
/// Behaviour matrix on connection open:
/// <list type="bullet">
/// <item><description>Tenant resolved (<see cref="ITenantContext.HasTenant"/>) → <c>set_config('app.current_tenant_id', tenant, false)</c>.</description></item>
/// <item><description>No tenant, but an authenticated HTTP request is in flight → <see cref="InvalidOperationException"/> (fail-loud: the tenancy middleware is missing or bypassed).</description></item>
/// <item><description>No tenant, no authenticated caller (startup migration, health ping) → the key is set to <c>''</c>; the <c>NULLIF(..., '')</c> RLS policies then hide every tenant row (fail-closed).</description></item>
/// </list>
/// </para>
/// <para>
/// Registered <b>scoped</b> (it reads the scoped <see cref="ITenantContext"/>) and only on
/// PostgreSQL providers — <c>set_config</c> does not exist on SQLite/InMemory.
/// </para>
/// </remarks>
public sealed class SpaceOsTenantSessionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<SpaceOsTenantSessionInterceptor> _logger;

    /// <summary>Creates the interceptor.</summary>
    /// <param name="tenantContext">The scoped tenant context (claims-backed in hosts, fixed in tests).</param>
    /// <param name="httpContextAccessor">Used only for the fail-loud "authenticated but unresolved" check.</param>
    /// <param name="logger">Diagnostic logger.</param>
    public SpaceOsTenantSessionInterceptor(
        ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor,
        ILogger<SpaceOsTenantSessionInterceptor> logger)
    {
        ArgumentNullException.ThrowIfNull(tenantContext);
        ArgumentNullException.ThrowIfNull(httpContextAccessor);
        ArgumentNullException.ThrowIfNull(logger);
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <inheritdoc />
    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        SetConfig(connection, ResolveSessionValue());
        base.ConnectionOpened(connection, eventData);
    }

    /// <inheritdoc />
    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        await SetConfigAsync(connection, ResolveSessionValue(), cancellationToken).ConfigureAwait(false);
        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public override InterceptionResult ConnectionClosing(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        // Reset unconditionally so a pooled connection never leaks the previous
        // request's tenant to the next request (kernel parity).
        SetConfig(connection, string.Empty);
        return base.ConnectionClosing(connection, eventData, result);
    }

    /// <inheritdoc />
    public override async ValueTask<InterceptionResult> ConnectionClosingAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        await SetConfigAsync(connection, string.Empty, CancellationToken.None).ConfigureAwait(false);
        return await base.ConnectionClosingAsync(connection, eventData, result).ConfigureAwait(false);
    }

    /// <summary>
    /// Resolves the value to place into <c>app.current_tenant_id</c> for this connection.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// An authenticated HTTP request reached the database without a resolved tenant —
    /// the tenancy middleware is missing or was bypassed. Deliberately fatal (ADR-062).
    /// </exception>
    private string ResolveSessionValue()
    {
        if (_tenantContext.HasTenant)
            return _tenantContext.TenantId.ToString();

        if (_httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated == true)
        {
            throw new InvalidOperationException(
                "Authenticated request reached the database without a resolved tenant. " +
                "Register UseSpaceOsModuleTenancy() after UseAuthentication() — refusing to run " +
                "queries without tenant isolation (ADR-062 fail-loud rule).");
        }

        // Startup migrations, health pings, anonymous endpoints: fail-closed. The RLS
        // policies see NULL via NULLIF(current_setting(...), '') and hide every tenant row.
        _logger.LogDebug("No tenant in scope; app.current_tenant_id left empty (fail-closed).");
        return string.Empty;
    }

    private static void SetConfig(DbConnection connection, string value)
    {
        using var command = CreateSetConfigCommand(connection, value);
        command.ExecuteNonQuery();
    }

    private static async Task SetConfigAsync(DbConnection connection, string value, CancellationToken ct)
    {
        var command = CreateSetConfigCommand(connection, value);
        await using (command.ConfigureAwait(false))
        {
            await command.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
    }

    /// <summary>
    /// Builds the parameterised <c>set_config</c> command — the tenant value is always a
    /// parameter, never interpolated into SQL (kernel parity; closes the injection surface
    /// of the old per-module copies).
    /// </summary>
    private static DbCommand CreateSetConfigCommand(DbConnection connection, string value)
    {
        var command = connection.CreateCommand();
        command.CommandText = "SELECT set_config(@key, @value, false)";

        var keyParameter = command.CreateParameter();
        keyParameter.ParameterName = "@key";
        keyParameter.Value = TenancyDefaults.PgSessionKey;
        command.Parameters.Add(keyParameter);

        var valueParameter = command.CreateParameter();
        valueParameter.ParameterName = "@value";
        valueParameter.Value = value;
        command.Parameters.Add(valueParameter);

        return command;
    }
}
