using Microsoft.AspNetCore.Http;

namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>
/// <see cref="ITenantContext"/> backed by the tenant that
/// <see cref="TenantResolutionMiddleware"/> resolved for the current request.
/// </summary>
/// <remarks>
/// The middleware is the single resolution point; this class only reads the published
/// value. Reading <see cref="TenantId"/> without a resolved tenant throws — the silent
/// <c>Guid.Empty</c> fallbacks of the pre-ADR <c>HttpTenantContext</c> copies are gone.
/// </remarks>
public sealed class ClaimsTenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>Creates the context reader.</summary>
    /// <param name="httpContextAccessor">Accessor for the ambient HTTP context.</param>
    public ClaimsTenantContext(IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(httpContextAccessor);
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public bool HasTenant =>
        _httpContextAccessor.HttpContext?.Items.TryGetValue(TenancyDefaults.HttpContextItemKey, out var value) == true
        && value is Guid;

    /// <inheritdoc />
    public Guid TenantId =>
        _httpContextAccessor.HttpContext?.Items.TryGetValue(TenancyDefaults.HttpContextItemKey, out var value) == true
        && value is Guid tenantId
            ? tenantId
            : throw new InvalidOperationException(
                "No tenant is resolved for the current request. Ensure UseSpaceOsModuleTenancy() " +
                "is registered after UseAuthentication(), and that the endpoint requires authorization.");
}
