namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>
/// An <see cref="ITenantContext"/> pinned to a single tenant. Intended for integration
/// tests and background work that operates on behalf of a known tenant.
/// </summary>
public sealed class FixedTenantContext : ITenantContext
{
    private readonly Guid _tenantId;

    /// <summary>Creates a context pinned to <paramref name="tenantId"/>.</summary>
    /// <param name="tenantId">The tenant id; must not be <see cref="Guid.Empty"/>.</param>
    /// <exception cref="ArgumentException">Thrown when <paramref name="tenantId"/> is empty.</exception>
    public FixedTenantContext(Guid tenantId)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("FixedTenantContext requires a non-empty tenant id.", nameof(tenantId));
        _tenantId = tenantId;
    }

    /// <inheritdoc />
    public bool HasTenant => true;

    /// <inheritdoc />
    public Guid TenantId => _tenantId;
}
