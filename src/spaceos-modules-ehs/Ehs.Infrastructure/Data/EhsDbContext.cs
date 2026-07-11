// Ehs.Infrastructure/Data/EhsDbContext.cs

using Ehs.Domain.Aggregates;
using Ehs.Domain.Entities;
using Ehs.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Ehs.Infrastructure.Data;

/// <summary>
/// EF Core DbContext for EHS module.
/// </summary>
public sealed class EhsDbContext : DbContext
{
    public EhsDbContext(DbContextOptions<EhsDbContext> options) : base(options) { }

    public DbSet<EhsEvent> EhsEvents => Set<EhsEvent>();
    public DbSet<RiskAssessment> RiskAssessments => Set<RiskAssessment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<EhsEvent>(entity =>
        {
            entity.ToTable("ehs_events");

            entity.HasKey(e => e.EventId);

            entity.Property(e => e.EventId)
                .HasColumnName("event_id")
                .HasConversion(
                    id => id.Value,
                    value => EventId.From(value))
                .IsRequired();

            entity.Property(e => e.Sequence)
                .HasColumnName("sequence")
                .ValueGeneratedOnAdd() // SERIAL
                .IsRequired();

            entity.Property(e => e.Type)
                .HasColumnName("type")
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.PayloadJson)
                .HasColumnName("payload")
                .HasColumnType("jsonb")
                .IsRequired();

            entity.Property(e => e.MetaJson)
                .HasColumnName("meta")
                .HasColumnType("jsonb");

            entity.Property(e => e.TenantId)
                .HasColumnName("tenant_id")
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.HasIndex(e => e.Sequence)
                .HasDatabaseName("idx_ehs_events_sequence");

            entity.HasIndex(e => e.CreatedAt)
                .HasDatabaseName("idx_ehs_events_created_at")
                .IsDescending();

            entity.HasIndex(e => e.TenantId)
                .HasDatabaseName("idx_ehs_events_tenant_id");
        });

        modelBuilder.Entity<RiskAssessment>(entity =>
        {
            entity.ToTable("risk_assessments");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .IsRequired();

            entity.Property(e => e.OrganizationId)
                .HasColumnName("organization_id")
                .IsRequired();

            entity.Property(e => e.AssessmentId)
                .HasColumnName("assessment_id")
                .IsRequired();

            entity.Property(e => e.LikelihoodBefore)
                .HasColumnName("likelihood_before")
                .IsRequired();

            entity.Property(e => e.SeverityBefore)
                .HasColumnName("severity_before")
                .IsRequired();

            entity.Property(e => e.LikelihoodAfter)
                .HasColumnName("likelihood_after")
                .IsRequired();

            entity.Property(e => e.SeverityAfter)
                .HasColumnName("severity_after")
                .IsRequired();

            entity.Property(e => e.Category)
                .HasColumnName("category")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.Notes)
                .HasColumnName("notes")
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(e => e.CreatedBy)
                .HasColumnName("created_by")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(e => e.DataHash)
                .HasColumnName("data_hash")
                .HasMaxLength(64)
                .IsRequired();

            // Ignore calculated properties (not stored in DB)
            entity.Ignore(e => e.RiskScoreBefore);
            entity.Ignore(e => e.RiskScoreAfter);
            entity.Ignore(e => e.ImprovementScore);

            // Indexes for performance
            entity.HasIndex(e => e.OrganizationId)
                .HasDatabaseName("idx_risk_assessments_org_id");

            entity.HasIndex(e => e.CreatedAt)
                .HasDatabaseName("idx_risk_assessments_created_at")
                .IsDescending();

            entity.HasIndex(e => e.DataHash)
                .HasDatabaseName("idx_risk_assessments_data_hash");
        });
    }
}
