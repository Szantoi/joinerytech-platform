namespace SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;

using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;

/// <summary>
/// DbConnectionInterceptor that sets PostgreSQL session variables for RLS.
/// Sets kontrolling.set_tenant_context(tenantId) on every connection.
/// </summary>
/// <remarks>
/// The tenant context is set on <c>ConnectionOpened</c>, not
/// <c>ConnectionOpening</c>: the statement needs an OPEN connection to run on.
/// Doing it in the "opening" callbacks threw "Connection is not open" on the
/// very first query.
/// </remarks>
public sealed class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantDbConnectionInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    public override void ConnectionOpened(
        DbConnection connection,
        ConnectionEndEventData eventData)
    {
        SetTenantContext(connection);
        base.ConnectionOpened(connection, eventData);
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken ct = default)
    {
        await SetTenantContextAsync(connection, ct).ConfigureAwait(false);
        await base.ConnectionOpenedAsync(connection, eventData, ct).ConfigureAwait(false);
    }

    private void SetTenantContext(DbConnection connection)
    {
        if (connection is not NpgsqlConnection npgsqlConnection)
            return;

        var tenantId = _tenantContext.GetCurrentTenantId();

        using var command = npgsqlConnection.CreateCommand();
        command.CommandText = "SELECT kontrolling.set_tenant_context($1)";
        command.Parameters.Add(new NpgsqlParameter { Value = tenantId });
        command.ExecuteNonQuery();
    }

    private async Task SetTenantContextAsync(DbConnection connection, CancellationToken ct)
    {
        if (connection is not NpgsqlConnection npgsqlConnection)
            return;

        var tenantId = _tenantContext.GetCurrentTenantId();

        await using var command = npgsqlConnection.CreateCommand();
        command.CommandText = "SELECT kontrolling.set_tenant_context($1)";
        command.Parameters.Add(new NpgsqlParameter { Value = tenantId });
        await command.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
    }
}
