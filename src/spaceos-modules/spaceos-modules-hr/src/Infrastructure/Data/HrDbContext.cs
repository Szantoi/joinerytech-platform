using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Infrastructure.Data.Configuration;

namespace SpaceOS.Modules.HR.Infrastructure.Data;

/// <summary>
/// HR module DbContext.
/// Schema: hr
/// </summary>
public sealed class HrDbContext : DbContext
{
    public HrDbContext(DbContextOptions<HrDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Employees aggregate root.
    /// </summary>
    public DbSet<Employee> Employees => Set<Employee>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Set default schema
        modelBuilder.HasDefaultSchema("hr");

        // Apply entity type configurations
        modelBuilder.ApplyConfiguration(new EmployeeConfiguration());

        // Note: RLS filter is applied per-entity in EmployeeConfiguration
        // Global RLS would require ICurrentTenant service injection
    }
}
