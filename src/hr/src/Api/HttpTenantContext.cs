using SpaceOS.Modules.HR.Application.Contracts;

namespace SpaceOS.Modules.HR.Api;

/// <summary>
/// HTTP-based tenant context: reads the tenant ID from the X-Tenant-Id header
/// (EHS HttpTenantContext precedent). Feeds the RLS session context via
/// TenantDbConnectionInterceptor.
/// </summary>
public class HttpTenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpTenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid TenantId
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext
                ?? throw new InvalidOperationException("HTTP context is not available.");

            if (!httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdHeader))
            {
                throw new InvalidOperationException("X-Tenant-Id header is missing.");
            }

            if (!Guid.TryParse(tenantIdHeader.ToString(), out var tenantId))
            {
                throw new InvalidOperationException("X-Tenant-Id header is not a valid GUID.");
            }

            return tenantId;
        }
    }
}
