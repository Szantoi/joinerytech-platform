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
    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public HRDbContext(DbContextOptions<HRDbContext> options) : base(options) { }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters, ADR-062) is active in hosts. Tools/tests using the
    /// options-only constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public HRDbContext(
        DbContextOptions<HRDbContext> options,
        SpaceOS.Modules.Hosting.Tenancy.ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<Absence> Absences { get; set; }

    /// <summary>Current tenant for the query filters; null disables the filter (kernel pattern).</summary>
    private Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Schema
        modelBuilder.HasDefaultSchema("hr");

        // Entity configurations
        modelBuilder.ApplyConfiguration(new EmployeeEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new AbsenceEntityTypeConfiguration());

        // ADR-062 second isolation layer: tenant query filter on both aggregate roots
        // (kernel AppDbContext pattern) — guards even where RLS is inert.
        modelBuilder.Entity<Employee>()
            .HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<Absence>()
            .HasQueryFilter(a => CurrentTenantId == null || a.TenantId == CurrentTenantId);
    }
}
