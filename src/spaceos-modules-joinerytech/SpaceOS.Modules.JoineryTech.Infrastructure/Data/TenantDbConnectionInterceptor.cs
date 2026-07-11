using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using System.Data.Common;

namespace SpaceOS.Modules.JoineryTech.Infrastructure.Data;

/// <summary>
/// EF Core DbConnectionInterceptor that automatically sets the PostgreSQL GUC parameter
/// (app.tenant_id) for Row-Level Security (RLS) enforcement.
///
/// This ensures multi-tenant isolation at the database level.
/// </summary>
public sealed class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<TenantDbConnectionInterceptor> _logger;

    public TenantDbConnectionInterceptor(
        IHttpContextAccessor httpContextAccessor,
        ILogger<TenantDbConnectionInterceptor> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken ct = default)
    {
        await base.ConnectionOpeningAsync(connection, eventData, result, ct).ConfigureAwait(false);

        // Extract tenant_id from JWT claims
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated == true)
        {
            var tenantIdClaim = httpContext.User.FindFirst("tenant_id");
            if (tenantIdClaim is not null && Guid.TryParse(tenantIdClaim.Value, out var tenantId))
            {
                // Set PostgreSQL GUC parameter for RLS enforcement
                await using var command = connection.CreateCommand();
                command.CommandText = $"SET LOCAL app.tenant_id = '{tenantId}';";

                try
                {
                    await command.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
                    _logger.LogDebug("Tenant context set: {TenantId}", tenantId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to set tenant context for tenant {TenantId}", tenantId);
                    throw;
                }
            }
            else
            {
                _logger.LogWarning("Authenticated request without valid tenant_id claim");
            }
        }

        return result;
    }

    public override InterceptionResult ConnectionOpening(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        // Synchronous version (fallback)
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated == true)
        {
            var tenantIdClaim = httpContext.User.FindFirst("tenant_id");
            if (tenantIdClaim is not null && Guid.TryParse(tenantIdClaim.Value, out var tenantId))
            {
                using var command = connection.CreateCommand();
                command.CommandText = $"SET LOCAL app.tenant_id = '{tenantId}';";

                try
                {
                    command.ExecuteNonQuery();
                    _logger.LogDebug("Tenant context set (sync): {TenantId}", tenantId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to set tenant context (sync) for tenant {TenantId}", tenantId);
                    throw;
                }
            }
        }

        return base.ConnectionOpening(connection, eventData, result);
    }
}
