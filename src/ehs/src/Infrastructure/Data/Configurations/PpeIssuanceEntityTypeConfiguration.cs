using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for PpeIssuance aggregate (PPE hand-outs, FSM).
/// IsExpired is calculated in the domain — it has NO column.
/// </summary>
public class PpeIssuanceEntityTypeConfiguration : IEntityTypeConfiguration<PpeIssuance>
{
    public void Configure(EntityTypeBuilder<PpeIssuance> builder)
    {
        builder.ToTable("ppe_issuances", "ehs");
        builder.HasKey(i => i.IssuanceId);

        builder.Property(i => i.IssuanceId)
            .IsRequired()
            .HasColumnName("issuance_id");

        // TenantId for RLS
        builder.Property(i => i.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(i => i.TenantId)
            .HasDatabaseName("ix_ppe_issuances_tenant_id");

        builder.Property(i => i.EmployeeId)
            .IsRequired()
            .HasColumnName("employee_id");
        builder.HasIndex(i => i.EmployeeId)
            .HasDatabaseName("ix_ppe_issuances_employee_id");

        builder.Property(i => i.PpeItemId)
            .IsRequired()
            .HasColumnName("ppe_item_id");
        builder.HasIndex(i => i.PpeItemId)
            .HasDatabaseName("ix_ppe_issuances_ppe_item_id");

        builder.Property(i => i.IssuedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("issued_at");

        builder.Property(i => i.IssuedBy)
            .IsRequired()
            .HasColumnName("issued_by");

        builder.Property(i => i.Quantity)
            .IsRequired()
            .HasColumnName("quantity");

        builder.Property(i => i.ExpiresAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("expires_at");

        builder.Property(i => i.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");
        builder.HasIndex(i => i.Status)
            .HasDatabaseName("ix_ppe_issuances_status");

        builder.Property(i => i.AcknowledgedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("acknowledged_at");

        builder.Property(i => i.ReturnedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("returned_at");

        builder.Property(i => i.ReplacedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("replaced_at");

        builder.Property(i => i.ReplacementIssuanceId)
            .HasColumnName("replacement_issuance_id");

        // Calculated property — never stored
        builder.Ignore(i => i.IsExpired);
    }
}
