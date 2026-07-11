using Microsoft.EntityFrameworkCore.Diagnostics;
using SpaceOS.Modules.HR.Application.Contracts;
using System.Data.Common;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence;

/// <summary>
/// DbConnectionInterceptor that sets PostgreSQL tenant context for RLS policies.
/// (DMS Week 3 pattern reuse)
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
        SetTenantContext(connection, _tenantContext.TenantId);
        return base.ConnectionOpening(connection, eventData, result);
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken cancellationToken = default)
    {
        await SetTenantContextAsync(connection, _tenantContext.TenantId, cancellationToken)
            .ConfigureAwait(false);
        return await base.ConnectionOpeningAsync(connection, eventData, result, cancellationToken)
            .ConfigureAwait(false);
    }

    private static void SetTenantContext(DbConnection connection, Guid tenantId)
    {
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = $"SELECT hr.set_tenant_context('{tenantId}'::uuid);";
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"Failed to set tenant context for tenant {tenantId}", ex);
        }
    }

    private static async Task SetTenantContextAsync(
        DbConnection connection,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT hr.set_tenant_context('{tenantId}'::uuid);";
            await command.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"Failed to set tenant context for tenant {tenantId}", ex);
        }
    }
}
