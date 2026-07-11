namespace SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;

using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;

/// <summary>
/// DbConnectionInterceptor that sets PostgreSQL session variables for RLS.
/// Sets kontrolling.set_tenant_context(tenantId) on every connection.
/// </summary>
public sealed class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantDbConnectionInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    public override InterceptionResult ConnectionOpening(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        SetTenantContext(connection);
        return base.ConnectionOpening(connection, eventData, result);
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken ct = default)
    {
        await SetTenantContextAsync(connection, ct).ConfigureAwait(false);
        return await base.ConnectionOpeningAsync(connection, eventData, result, ct).ConfigureAwait(false);
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
