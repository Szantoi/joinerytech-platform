using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api;

/// <summary>
/// HTTP-based tenant context implementation.
/// Reads tenant ID from X-Tenant-Id header.
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
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                throw new InvalidOperationException("HTTP context is not available.");
            }

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
