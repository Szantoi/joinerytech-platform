using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for SafetyWalk aggregate.
/// Findings are owned entities (safety_walk_findings table); Participants are
/// stored as a native uuid[] column.
/// </summary>
public class SafetyWalkEntityTypeConfiguration : IEntityTypeConfiguration<SafetyWalk>
{
    public void Configure(EntityTypeBuilder<SafetyWalk> builder)
    {
        builder.ToTable("safety_walks", "ehs");
        builder.HasKey(w => w.SafetyWalkId);

        builder.Property(w => w.SafetyWalkId)
            .IsRequired()
            .HasColumnName("safety_walk_id");

        // TenantId for RLS
        builder.Property(w => w.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(w => w.TenantId)
            .HasDatabaseName("ix_safety_walks_tenant_id");

        builder.Property(w => w.LocationId)
            .IsRequired()
            .HasColumnName("location_id");
        builder.HasIndex(w => w.LocationId)
            .HasDatabaseName("ix_safety_walks_location_id");

        builder.Property(w => w.ScheduledDate)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("scheduled_date");

        builder.Property(w => w.ConductedBy)
            .IsRequired()
            .HasColumnName("conducted_by");

        // Participants — Npgsql maps List<Guid> to uuid[]
        builder.Property(w => w.Participants)
            .HasColumnName("participants");

        builder.Property(w => w.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");
        builder.HasIndex(w => w.Status)
            .HasDatabaseName("ix_safety_walks_status");

        builder.Property(w => w.StartedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("started_at");

        builder.Property(w => w.CompletedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("completed_at");

        builder.Property(w => w.ClosedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("closed_at");

        builder.Property(w => w.CancelledAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("cancelled_at");

        // Owned collection: Findings (0-n) → safety_walk_findings table
        builder.OwnsMany(w => w.Findings, findings =>
        {
            findings.ToTable("safety_walk_findings", "ehs");
            findings.WithOwner().HasForeignKey(f => f.SafetyWalkId);
            findings.HasKey(f => f.FindingId);

            findings.Property(f => f.FindingId)
                .IsRequired()
                .HasColumnName("finding_id");

            findings.Property(f => f.SafetyWalkId)
                .IsRequired()
                .HasColumnName("safety_walk_id");

            findings.Property(f => f.Description)
                .IsRequired()
                .HasMaxLength(2000)
                .HasColumnName("description");

            findings.Property(f => f.Severity)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired()
                .HasColumnName("severity");

            findings.Property(f => f.PhotoS3Key)
                .HasMaxLength(500)
                .HasColumnName("photo_s3_key");

            findings.Property(f => f.RequiresAction)
                .IsRequired()
                .HasColumnName("requires_action");

            findings.Property(f => f.CorrectiveActionId)
                .HasColumnName("corrective_action_id");

            findings.Property(f => f.LinkedRiskAssessmentId)
                .HasColumnName("linked_risk_assessment_id");

            findings.Property(f => f.RecordedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone")
                .HasColumnName("recorded_at");

            findings.HasIndex(f => f.SafetyWalkId)
                .HasDatabaseName("ix_safety_walk_findings_safety_walk_id");
        });
    }
}
