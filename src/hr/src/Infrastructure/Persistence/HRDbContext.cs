using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Infrastructure.Persistence.Configurations;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence;

/// <summary>
/// HR Module DbContext with multi-tenant support via Row-Level Security (RLS).
/// Handles Employee and Absence aggregates with skills and absence tracking.
/// </summary>
public class HRDbContext : DbContext
{
    public HRDbContext(DbContextOptions<HRDbContext> options) : base(options) { }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<Absence> Absences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Schema
        modelBuilder.HasDefaultSchema("hr");

        // Entity configurations
        modelBuilder.ApplyConfiguration(new EmployeeEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new AbsenceEntityTypeConfiguration());
    }
}
