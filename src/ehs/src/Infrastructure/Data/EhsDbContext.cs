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

    public EhsDbContext(DbContextOptions<EhsDbContext> options)
        : base(options)
    {
    }

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
    }
}
