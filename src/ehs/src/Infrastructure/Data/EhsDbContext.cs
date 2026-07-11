using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
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
    }
}
