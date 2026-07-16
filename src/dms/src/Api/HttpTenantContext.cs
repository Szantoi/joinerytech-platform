using Microsoft.AspNetCore.Http;
using SpaceOS.Modules.DMS.Application.Contracts;

namespace SpaceOS.Modules.DMS.Api;

/// <summary>
/// HTTP-based tenant context — reads the tenant id from the X-Tenant-Id header
/// (EHS HttpTenantContext precedent; RLS scoping input). Auth/JWT claim source
/// is the platform auth integration follow-up.
///
/// Outside a request (startup migration, background work) or with a
/// missing/invalid header it returns Guid.Empty: the RLS interceptor then
/// skips set_config, and tenant-requiring endpoints validate it themselves
/// (create → 400).
/// </summary>
public class HttpTenantContext : ITenantContext
{
    /// <summary>Tenant header name (module convention).</summary>
    public const string HeaderName = "X-Tenant-Id";

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
                return Guid.Empty;

            if (!httpContext.Request.Headers.TryGetValue(HeaderName, out var tenantIdHeader))
                return Guid.Empty;

            return Guid.TryParse(tenantIdHeader.ToString(), out var tenantId)
                ? tenantId
                : Guid.Empty;
        }
    }
}
