using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Application.Tenancy;

namespace SpaceOS.Projects.Infrastructure.Tenancy;

/// <summary>
/// Adapts the hosting package's <see cref="ITenantContext"/> onto the application layer's
/// <see cref="ICurrentTenant"/>.
/// </summary>
/// <remarks>
/// The whole adapter is one property, and it exists so the application layer does not have to
/// reference ASP.NET Core to know who is calling. The translation it performs is the interesting
/// half: the platform type models "maybe no tenant" because an interceptor genuinely runs on
/// connections belonging to nobody; a command handler does not, so the absence becomes a loud
/// failure here rather than a write landing under <c>Guid.Empty</c>.
/// </remarks>
public sealed class TenantContextCurrentTenant(ITenantContext tenantContext) : ICurrentTenant
{
    /// <inheritdoc />
    /// <exception cref="InvalidOperationException">
    /// No tenant is in scope. This is the same failure the RLS interceptor raises on an
    /// authenticated request, caught one layer earlier and with the command in view.
    /// </exception>
    public Guid TenantId => tenantContext.HasTenant
        ? tenantContext.TenantId
        : throw new InvalidOperationException(
            "A projects command ran without a resolved tenant. Register UseSpaceOsModuleTenancy() " +
            "after UseAuthentication(); refusing to write a row that would belong to nobody.");
}
