using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

/// <summary>
/// EF Core connection interceptor that sets PostgreSQL session context for RLS.
/// Reuses DMS Week 3 pattern, adapted for Maintenance schema.
/// Runs on ConnectionOpened (the connection must already be open to execute the
/// SET command) and uses set_config with a parameter directly, so it works even
/// before the maintenance.set_tenant_context helper function exists (first migration).
/// </summary>
public class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantDbConnectionInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// Synchronous handler — sets the 'app.tenant_id' session variable for RLS policies.
    /// </summary>
    public override void ConnectionOpened(
        DbConnection connection,
        ConnectionEndEventData eventData)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            using var command = CreateSetTenantCommand(connection, tenantId);
            command.ExecuteNonQuery();
        }

        base.ConnectionOpened(connection, eventData);
    }

    /// <summary>
    /// Asynchronous handler — sets the 'app.tenant_id' session variable for RLS policies.
    /// </summary>
    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken ct = default)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            var command = CreateSetTenantCommand(connection, tenantId);
            await using (command.ConfigureAwait(false))
            {
                await command.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
            }
        }

        await base.ConnectionOpenedAsync(connection, eventData, ct).ConfigureAwait(false);
    }

    private static DbCommand CreateSetTenantCommand(DbConnection connection, Guid tenantId)
    {
        var command = connection.CreateCommand();
        command.CommandText = "SELECT set_config('app.tenant_id', @tenant_id, false)";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "tenant_id";
        parameter.Value = tenantId.ToString();
        command.Parameters.Add(parameter);

        return command;
    }
}
