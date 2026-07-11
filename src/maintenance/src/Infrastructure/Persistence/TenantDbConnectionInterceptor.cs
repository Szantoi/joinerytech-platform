using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

/// <summary>
/// EF Core connection interceptor that sets PostgreSQL session context for RLS.
/// Reuses DMS Week 3 pattern exactly, adapted for Maintenance schema.
/// Intercepts both sync and async connection opening to set tenant context.
/// </summary>
public class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantDbConnectionInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// Synchronous connection opening handler.
    /// Sets the PostgreSQL session variable 'app.tenant_id' for RLS policies.
    /// </summary>
    public override InterceptionResult ConnectionOpening(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            using var command = connection.CreateCommand();
            command.CommandText = $"SELECT maintenance.set_tenant_context('{tenantId}')";
            command.ExecuteNonQuery();
        }

        return base.ConnectionOpening(connection, eventData, result);
    }

    /// <summary>
    /// Asynchronous connection opening handler.
    /// Sets the PostgreSQL session variable 'app.tenant_id' for RLS policies.
    /// </summary>
    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken ct = default)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT maintenance.set_tenant_context('{tenantId}')";
            await command.ExecuteNonQueryAsync(ct);
        }

        return await base.ConnectionOpeningAsync(connection, eventData, result, ct);
    }
}
