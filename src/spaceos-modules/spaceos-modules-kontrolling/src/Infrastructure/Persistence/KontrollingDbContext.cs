namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Configurations;

/// <summary>
/// Kontrolling module DbContext.
/// Schema: kontrolling
/// </summary>
public sealed class KontrollingDbContext : DbContext
{
    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public KontrollingDbContext(DbContextOptions<KontrollingDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters, ADR-062) is active in hosts. Tools/tests using the
    /// options-only constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public KontrollingDbContext(
        DbContextOptions<KontrollingDbContext> options,
        SpaceOS.Modules.Hosting.Tenancy.ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    /// <summary>Current tenant for the query filters; null disables the filter (kernel pattern).</summary>
    private Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    /// <summary>
    /// Overhead configurations (tenant-level overhead calculation settings)
    /// </summary>
    public DbSet<OverheadConfig> OverheadConfigs => Set<OverheadConfig>();

    /// <summary>
    /// Cost adjustments (manual corrections to cost calculations)
    /// </summary>
    public DbSet<CostAdjustment> CostAdjustments => Set<CostAdjustment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Set default schema
        modelBuilder.HasDefaultSchema("kontrolling");

        // Apply entity type configurations
        modelBuilder.ApplyConfiguration(new OverheadConfigEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new CostAdjustmentEntityTypeConfiguration());

        // ADR-062 second isolation layer: tenant query filter on the aggregate roots
        // (kernel AppDbContext pattern). NOTE: HasQueryFilter replaces any earlier filter,
        // so the CostAdjustment soft-delete predicate (configured in its
        // EntityTypeConfiguration) is re-stated here combined with the tenant filter.
        modelBuilder.Entity<OverheadConfig>()
            .HasQueryFilter(o => CurrentTenantId == null || o.TenantId == CurrentTenantId);
        modelBuilder.Entity<CostAdjustment>()
            .HasQueryFilter(c => !c.IsDeleted && (CurrentTenantId == null || c.TenantId == CurrentTenantId));
    }
}
