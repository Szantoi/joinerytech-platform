using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Configurations;

/// <summary>
/// Entity Type Configuration for QACheckpoint aggregate.
/// Maps QACheckpoint with owned collection InspectionCriteria and RLS support.
/// </summary>
public class QACheckpointEntityTypeConfiguration : IEntityTypeConfiguration<QACheckpoint>
{
    public void Configure(EntityTypeBuilder<QACheckpoint> builder)
    {
        builder.ToTable("qa_checkpoints", "qa");
        builder.HasKey(q => q.Id);

        // StronglyTypedId conversion
        builder.Property(q => q.Id)
            .HasConversion(
                id => id.Value,
                value => new QACheckpointId(value))
            .HasColumnName("id");

        // TenantId for RLS
        builder.Property(q => q.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(q => q.TenantId)
            .HasDatabaseName("ix_qa_checkpoints_tenant_id");

        // Basic properties
        builder.Property(q => q.Name)
            .IsRequired()
            .HasMaxLength(100)
            .HasColumnName("name");

        builder.Property(q => q.Description)
            .HasMaxLength(500)
            .HasColumnName("description");

        builder.Property(q => q.CheckpointType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("checkpoint_type");

        builder.Property(q => q.CriticalLevel)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("critical_level");

        builder.Property(q => q.IsActive)
            .IsRequired()
            .HasColumnName("is_active");

        // Timestamp properties
        builder.Property(q => q.CreatedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("created_at");

        builder.Property(q => q.UpdatedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("updated_at");

        // Owned collection: InspectionCriteria → qa_checkpoint_criteria table
        builder.OwnsMany(q => q.Criteria, criteria =>
        {
            criteria.ToTable("qa_checkpoint_criteria", "qa");
            criteria.WithOwner().HasForeignKey("qa_checkpoint_id");

            criteria.Property(c => c.Id)
                .IsRequired()
                .HasMaxLength(36)
                .HasColumnName("id");

            criteria.Property(c => c.Type)
                .HasConversion<string>()
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnName("type");

            criteria.Property(c => c.Description)
                .IsRequired()
                .HasMaxLength(1000)
                .HasColumnName("description");

            criteria.Property(c => c.AcceptanceThreshold)
                .HasMaxLength(500)
                .HasColumnName("acceptance_threshold");

            criteria.HasIndex("qa_checkpoint_id")
                .HasDatabaseName("ix_qa_checkpoint_criteria_qa_checkpoint_id");
        });
    }
}
