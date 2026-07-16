namespace SpaceOS.Modules.Kontrolling.Api;

using Microsoft.AspNetCore.Http;
using SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;

/// <summary>
/// Reads the tenant of the current request from the <c>X-Tenant-Id</c> header
/// (EHS <c>HttpTenantContext</c> precedent).
/// </summary>
/// <remarks>
/// A missing or malformed header throws rather than defaulting: the tenant id
/// scopes every row-level-security check, so guessing it would be a data leak.
/// </remarks>
public sealed class HttpTenantContext(IHttpContextAccessor httpContextAccessor) : ITenantContext
{
    /// <summary>Header carrying the tenant scope.</summary>
    public const string HeaderName = "X-Tenant-Id";

    /// <exception cref="InvalidOperationException">
    /// There is no HTTP context, or the header is missing or not a GUID.
    /// </exception>
    public Guid GetCurrentTenantId()
    {
        var httpContext = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("HTTP context is not available.");

        if (!httpContext.Request.Headers.TryGetValue(HeaderName, out var header))
        {
            throw new InvalidOperationException($"{HeaderName} header is missing.");
        }

        return Guid.TryParse(header.ToString(), out var tenantId)
            ? tenantId
            : throw new InvalidOperationException($"{HeaderName} header is not a valid GUID.");
    }
}
