using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data;

/// <summary>
/// Entity Framework Core DbContext for EHS (Environment, Health & Safety) module.
/// Schema: "ehs"
/// </summary>
public class EhsDbContext : DbContext
{
    public DbSet<Incident> Incidents { get; set; } = null!;
    public DbSet<RiskAssessment> RiskAssessments { get; set; } = null!;
    public DbSet<TrainingRecord> TrainingRecords { get; set; } = null!;
    public DbSet<EhsLocation> Locations { get; set; } = null!;
    public DbSet<HazardousMaterial> HazardousMaterials { get; set; } = null!;
    public DbSet<PpeItem> PpeItems { get; set; } = null!;
    public DbSet<PpeIssuance> PpeIssuances { get; set; } = null!;
    public DbSet<SafetyWalk> SafetyWalks { get; set; } = null!;

    /// <summary>Unified CAPA registry — incident and safety-walk sourced actions</summary>
    public DbSet<CorrectiveAction> CorrectiveActions { get; set; } = null!;

    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public EhsDbContext(DbContextOptions<EhsDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters, ADR-062) is active in hosts. Tools/tests using the
    /// options-only constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public EhsDbContext(
        DbContextOptions<EhsDbContext> options,
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

        // Apply entity type configurations
        modelBuilder.ApplyConfiguration(new IncidentEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new RiskAssessmentEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new TrainingRecordEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new EhsLocationEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new HazardousMaterialEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new PpeItemEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new PpeIssuanceEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new SafetyWalkEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new CorrectiveActionEntityTypeConfiguration());

        // ADR-062 second isolation layer: tenant query filter on every aggregate root
        // (kernel AppDbContext pattern). RLS is the first layer; this guards against a
        // forgotten WHERE, a FORCE-less table or a misconfigured deploy role.
        modelBuilder.Entity<Incident>()
            .HasQueryFilter(i => CurrentTenantId == null || i.TenantId == CurrentTenantId);
        modelBuilder.Entity<RiskAssessment>()
            .HasQueryFilter(r => CurrentTenantId == null || r.TenantId == CurrentTenantId);
        modelBuilder.Entity<TrainingRecord>()
            .HasQueryFilter(t => CurrentTenantId == null || t.TenantId == CurrentTenantId);
        modelBuilder.Entity<EhsLocation>()
            .HasQueryFilter(l => CurrentTenantId == null || l.TenantId == CurrentTenantId);
        modelBuilder.Entity<HazardousMaterial>()
            .HasQueryFilter(h => CurrentTenantId == null || h.TenantId == CurrentTenantId);
        modelBuilder.Entity<PpeItem>()
            .HasQueryFilter(p => CurrentTenantId == null || p.TenantId == CurrentTenantId);
        modelBuilder.Entity<PpeIssuance>()
            .HasQueryFilter(p => CurrentTenantId == null || p.TenantId == CurrentTenantId);
        modelBuilder.Entity<SafetyWalk>()
            .HasQueryFilter(s => CurrentTenantId == null || s.TenantId == CurrentTenantId);
        modelBuilder.Entity<CorrectiveAction>()
            .HasQueryFilter(c => CurrentTenantId == null || c.TenantId == CurrentTenantId);
    }
}
