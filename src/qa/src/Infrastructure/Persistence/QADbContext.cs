using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Infrastructure.Persistence.Configurations;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core DbContext for QA module.
/// Schema: "qa"
/// </summary>
public class QADbContext : DbContext
{
    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public DbSet<QACheckpoint> QACheckpoints { get; set; } = null!;
    public DbSet<Inspection> Inspections { get; set; } = null!;
    public DbSet<Ticket> Tickets { get; set; } = null!;

    public QADbContext(DbContextOptions<QADbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters, ADR-062) is active in hosts. Tools/tests using the
    /// options-only constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public QADbContext(
        DbContextOptions<QADbContext> options,
        SpaceOS.Modules.Hosting.Tenancy.ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    /// <summary>Current tenant for the query filters; null disables the filter (kernel pattern).</summary>
    private Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfiguration(new QACheckpointEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new InspectionEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new TicketEntityTypeConfiguration());

        // ADR-062 second isolation layer: tenant query filter on every aggregate root
        // (kernel AppDbContext pattern) — guards even where RLS is inert.
        modelBuilder.Entity<QACheckpoint>()
            .HasQueryFilter(c => CurrentTenantId == null || c.TenantId == CurrentTenantId);
        modelBuilder.Entity<Inspection>()
            .HasQueryFilter(i => CurrentTenantId == null || i.TenantId == CurrentTenantId);
        modelBuilder.Entity<Ticket>()
            .HasQueryFilter(t => CurrentTenantId == null || t.TenantId == CurrentTenantId);
    }
}
