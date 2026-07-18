using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Configurations;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core DbContext for Maintenance module.
/// Manages Asset and WorkOrder aggregates with schema "maintenance".
/// Tenant isolation (ADR-062): PostgreSQL RLS via the shared
/// SpaceOsTenantSessionInterceptor plus tenant query filters as second layer.
/// </summary>
public class MaintenanceDbContext : DbContext
{
    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public MaintenanceDbContext(DbContextOptions<MaintenanceDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters, ADR-062) is active in hosts. Tools/tests using the
    /// options-only constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public MaintenanceDbContext(
        DbContextOptions<MaintenanceDbContext> options,
        SpaceOS.Modules.Hosting.Tenancy.ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Asset> Assets { get; set; } = null!;
    public DbSet<WorkOrder> WorkOrders { get; set; } = null!;

    /// <summary>Current tenant for the query filters; null disables the filter (kernel pattern).</summary>
    private Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("maintenance");

        modelBuilder.ApplyConfiguration(new AssetEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new WorkOrderEntityTypeConfiguration());

        // ADR-062 second isolation layer: tenant query filter on every aggregate root
        // (kernel AppDbContext pattern) — guards even where RLS is inert. Owned
        // collections (MaintenancePlans, Parts) are filtered through their owners.
        modelBuilder.Entity<Asset>()
            .HasQueryFilter(a => CurrentTenantId == null || a.TenantId == CurrentTenantId);
        modelBuilder.Entity<WorkOrder>()
            .HasQueryFilter(w => CurrentTenantId == null || w.TenantId == CurrentTenantId);
    }
}
