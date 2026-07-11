using Microsoft.EntityFrameworkCore.Diagnostics;
using SpaceOS.Modules.DMS.Application.Contracts;
using System.Data.Common;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence;

/// <summary>
/// DbConnection interceptor for setting tenant context in PostgreSQL RLS policies.
///
/// This interceptor is called every time a database connection is opened.
/// It sets the 'app.tenant_id' PostgreSQL configuration variable, which is then
/// used by RLS policies to filter rows by tenant.
/// </summary>
public class TenantDbConnectionInterceptor : DbConnectionInterceptor
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
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            SetTenantContext(connection, tenantId);
        }

        return base.ConnectionOpening(connection, eventData, result);
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken ct = default)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            await SetTenantContextAsync(connection, tenantId, ct).ConfigureAwait(false);
        }

        return await base.ConnectionOpeningAsync(connection, eventData, result, ct).ConfigureAwait(false);
    }

    private static void SetTenantContext(DbConnection connection, Guid tenantId)
    {
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = $"SELECT dms.set_tenant_context('{tenantId}'::uuid);";
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to set tenant context for tenant {tenantId}", ex);
        }
    }

    private static async Task SetTenantContextAsync(DbConnection connection, Guid tenantId, CancellationToken ct)
    {
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT dms.set_tenant_context('{tenantId}'::uuid);";
            await command.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to set tenant context for tenant {tenantId}", ex);
        }
    }
}
