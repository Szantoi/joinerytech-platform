using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Configurations;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core DbContext for Maintenance module.
/// Manages Asset and WorkOrder aggregates with schema "maintenance".
/// Implements RLS (Row-Level Security) for multi-tenancy via TenantDbConnectionInterceptor.
/// </summary>
public class MaintenanceDbContext : DbContext
{
    public MaintenanceDbContext(DbContextOptions<MaintenanceDbContext> options) : base(options)
    {
    }

    public DbSet<Asset> Assets { get; set; } = null!;
    public DbSet<WorkOrder> WorkOrders { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("maintenance");

        modelBuilder.ApplyConfiguration(new AssetEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new WorkOrderEntityTypeConfiguration());
    }
}
