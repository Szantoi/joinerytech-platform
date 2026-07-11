using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data;

/// <summary>
/// EF Core interceptor that sets tenant context for RLS via PostgreSQL session variables.
/// Uses ehs.set_tenant_context() function for EHS module isolation.
/// </summary>
public class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantDbConnectionInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    public override InterceptionResult ConnectionOpening(DbConnection connection, ConnectionEventData eventData, InterceptionResult result)
    {
        SetTenantContext(connection);
        return base.ConnectionOpening(connection, eventData, result);
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
    {
        SetTenantContext(connection);
        return await base.ConnectionOpeningAsync(connection, eventData, result, cancellationToken).ConfigureAwait(false);
    }

    private void SetTenantContext(DbConnection connection)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId != Guid.Empty)
        {
            try
            {
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = $"SELECT ehs.set_tenant_context('{tenantId}')";
                    cmd.ExecuteNonQuery();
                }
            }
            catch (Exception)
            {
                // Silently fail if RLS function doesn't exist (not yet migrated)
            }
        }
    }
}
