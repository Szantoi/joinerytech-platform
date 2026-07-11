using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for RiskAssessment aggregate.
/// Maps RiskAssessment with owned collection Controls (0-n)
/// ISO 45001 compliant 5×5 risk matrix
/// </summary>
public class RiskAssessmentEntityTypeConfiguration : IEntityTypeConfiguration<RiskAssessment>
{
    public void Configure(EntityTypeBuilder<RiskAssessment> builder)
    {
        builder.ToTable("risk_assessments", "ehs");
        builder.HasKey(r => r.RiskAssessmentId);

        // Primary key
        builder.Property(r => r.RiskAssessmentId)
            .IsRequired()
            .HasColumnName("risk_assessment_id");

        // TenantId for RLS
        builder.Property(r => r.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(r => r.TenantId)
            .HasDatabaseName("ix_risk_assessments_tenant_id");

        // Enums as strings
        builder.Property(r => r.Severity)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("severity");

        builder.Property(r => r.Likelihood)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("likelihood");

        builder.Property(r => r.RiskLevel)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("risk_level");

        builder.Property(r => r.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");

        // Scalar properties
        builder.Property(r => r.HazardDescription)
            .IsRequired()
            .HasMaxLength(1000)
            .HasColumnName("hazard_description");

        builder.Property(r => r.RiskScore)
            .IsRequired()
            .HasColumnName("risk_score");

        builder.Property(r => r.AssessedBy)
            .IsRequired()
            .HasColumnName("assessed_by");

        builder.Property(r => r.AssessedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("assessed_at");

        builder.Property(r => r.ReviewDueDate)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("review_due_date");

        // Indexes
        builder.HasIndex(r => r.RiskLevel)
            .HasDatabaseName("ix_risk_assessments_risk_level");

        builder.HasIndex(r => r.Status)
            .HasDatabaseName("ix_risk_assessments_status");

        builder.HasIndex(r => r.ReviewDueDate)
            .HasDatabaseName("ix_risk_assessments_review_due_date");

        // Owned collection: Controls (0-n) → risk_controls table
        builder.OwnsMany(r => r.Controls, controls =>
        {
            controls.ToTable("risk_controls", "ehs");
            controls.WithOwner().HasForeignKey("risk_assessment_id");

            controls.Property(c => c.RiskControlId)
                .IsRequired()
                .HasColumnName("risk_control_id");

            controls.Property(c => c.RiskAssessmentId)
                .IsRequired()
                .HasColumnName("risk_assessment_id");

            controls.Property(c => c.ControlMeasure)
                .IsRequired()
                .HasMaxLength(1000)
                .HasColumnName("control_measure");

            controls.Property(c => c.ResponsiblePerson)
                .IsRequired()
                .HasMaxLength(200)
                .HasColumnName("responsible_person");

            controls.Property(c => c.ImplementedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone")
                .HasColumnName("implemented_at");

            controls.Property(c => c.VerifiedAt)
                .HasColumnType("timestamp with time zone")
                .HasColumnName("verified_at");

            controls.HasIndex("risk_assessment_id")
                .HasDatabaseName("ix_risk_controls_risk_assessment_id");
        });
    }
}
