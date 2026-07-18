namespace SpaceOS.Modules.Ehs.Infrastructure.Data;

/// <summary>
/// Adapts the module-local <see cref="ITenantContext"/> onto the island-wide
/// <see cref="SpaceOS.Modules.Hosting.Tenancy.ITenantContext"/> (ADR-061): the tenant is
/// resolved once, from the JWT — the header-reading <c>HttpTenantContext</c> is gone.
/// </summary>
public sealed class HostingTenantContextAdapter : ITenantContext
{
    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext _inner;

    /// <summary>Creates the adapter over the shared tenant context.</summary>
    public HostingTenantContextAdapter(SpaceOS.Modules.Hosting.Tenancy.ITenantContext inner)
    {
        ArgumentNullException.ThrowIfNull(inner);
        _inner = inner;
    }

    /// <inheritdoc />
    public Guid TenantId => _inner.TenantId;
}
