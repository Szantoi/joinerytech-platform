using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for TrainingRecord aggregate.
/// Simple aggregate with no owned entities.
/// Status is computed property (not stored in DB)
/// </summary>
public class TrainingRecordEntityTypeConfiguration : IEntityTypeConfiguration<TrainingRecord>
{
    public void Configure(EntityTypeBuilder<TrainingRecord> builder)
    {
        builder.ToTable("training_records", "ehs");
        builder.HasKey(t => t.TrainingRecordId);

        // Primary key
        builder.Property(t => t.TrainingRecordId)
            .IsRequired()
            .HasColumnName("training_record_id");

        // TenantId for RLS
        builder.Property(t => t.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(t => t.TenantId)
            .HasDatabaseName("ix_training_records_tenant_id");

        // Foreign key to HR module
        builder.Property(t => t.EmployeeId)
            .IsRequired()
            .HasColumnName("employee_id");
        builder.HasIndex(t => t.EmployeeId)
            .HasDatabaseName("ix_training_records_employee_id");

        // Scalar properties
        builder.Property(t => t.TrainingType)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("training_type");

        builder.Property(t => t.CompletedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("completed_at");

        builder.Property(t => t.ExpiresAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("expires_at");

        builder.Property(t => t.IssuedBy)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("issued_by");

        builder.Property(t => t.CertificateNumber)
            .HasMaxLength(100)
            .HasColumnName("certificate_number");

        // Status is computed property - NOT mapped to database
        builder.Ignore(t => t.Status);

        // Indexes
        builder.HasIndex(t => t.ExpiresAt)
            .HasDatabaseName("ix_training_records_expires_at");

        builder.HasIndex(t => t.TrainingType)
            .HasDatabaseName("ix_training_records_training_type");
    }
}
