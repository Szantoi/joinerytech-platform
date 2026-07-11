using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Configurations;

/// <summary>
/// Entity Type Configuration for Inspection aggregate.
/// Maps Inspection with owned collection FailureNote and RLS support.
/// </summary>
public class InspectionEntityTypeConfiguration : IEntityTypeConfiguration<Inspection>
{
    public void Configure(EntityTypeBuilder<Inspection> builder)
    {
        builder.ToTable("inspections", "qa");
        builder.HasKey(i => i.Id);

        // StronglyTypedId conversion for InspectionId
        builder.Property(i => i.Id)
            .HasConversion(
                id => id.Value,
                value => new InspectionId(value))
            .HasColumnName("id");

        // TenantId for RLS
        builder.Property(i => i.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(i => i.TenantId)
            .HasDatabaseName("ix_inspections_tenant_id");

        // Foreign key to QACheckpoint (also with StronglyTypedId conversion)
        builder.Property(i => i.CheckpointId)
            .HasConversion(
                id => id.Value,
                value => new QACheckpointId(value))
            .IsRequired()
            .HasColumnName("checkpoint_id");

        builder.HasIndex(i => i.CheckpointId)
            .HasDatabaseName("ix_inspections_checkpoint_id");

        // Order and Product reference
        builder.Property(i => i.OrderId)
            .HasColumnName("order_id");

        builder.Property(i => i.ProductId)
            .HasColumnName("product_id");

        // Enum conversions
        builder.Property(i => i.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");

        builder.Property(i => i.Result)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("result");

        // Inspector and notes
        builder.Property(i => i.InspectorId)
            .IsRequired()
            .HasColumnName("inspector_id");

        builder.Property(i => i.Notes)
            .HasMaxLength(2000)
            .HasColumnName("notes");

        // Timestamp properties
        builder.Property(i => i.PlannedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("planned_at");

        builder.Property(i => i.StartedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("started_at");

        builder.Property(i => i.CompletedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("completed_at");

        // Owned collection: FailureNote → inspection_defects table
        builder.OwnsMany(i => i.FailureNotes, notes =>
        {
            notes.ToTable("inspection_defects", "qa");
            notes.WithOwner().HasForeignKey("inspection_id");

            notes.Property(n => n.Id)
                .IsRequired()
                .HasMaxLength(36)
                .HasColumnName("id");

            notes.Property(n => n.FailureType)
                .HasConversion<string>()
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnName("failure_type");

            notes.Property(n => n.Description)
                .IsRequired()
                .HasMaxLength(1000)
                .HasColumnName("description");

            notes.Property(n => n.PhotoUrl)
                .HasMaxLength(500)
                .HasColumnName("photo_url");

            notes.HasIndex("inspection_id")
                .HasDatabaseName("ix_inspection_defects_inspection_id");
        });
    }
}
