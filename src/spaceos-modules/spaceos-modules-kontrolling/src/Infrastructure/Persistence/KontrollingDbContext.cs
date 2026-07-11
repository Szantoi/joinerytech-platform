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
    public KontrollingDbContext(DbContextOptions<KontrollingDbContext> options)
        : base(options)
    {
    }

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
    }
}
