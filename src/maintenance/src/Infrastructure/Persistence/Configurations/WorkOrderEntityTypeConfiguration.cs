using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Configurations;

/// <summary>
/// Entity Type Configuration for WorkOrder aggregate.
/// Maps WorkOrder with owned collection of Parts, FK to Asset, and RLS support.
/// </summary>
public class WorkOrderEntityTypeConfiguration : IEntityTypeConfiguration<WorkOrder>
{
    public void Configure(EntityTypeBuilder<WorkOrder> builder)
    {
        builder.ToTable("work_orders", "maintenance");
        builder.HasKey(w => w.Id);

        // StronglyTypedId conversion for WorkOrderId
        builder.Property(w => w.Id)
            .HasConversion(
                id => id.Value,
                value => new WorkOrderId(value))
            .HasColumnName("id");

        // TenantId for RLS
        builder.Property(w => w.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(w => w.TenantId)
            .HasDatabaseName("ix_work_orders_tenant_id");

        // Foreign key to Asset (also with StronglyTypedId conversion)
        builder.Property(w => w.AssetId)
            .HasConversion(
                id => id.Value,
                value => new AssetId(value))
            .IsRequired()
            .HasColumnName("asset_id");

        builder.HasIndex(w => w.AssetId)
            .HasDatabaseName("ix_work_orders_asset_id");

        // Enum conversions
        builder.Property(w => w.Type)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("type");

        builder.Property(w => w.Priority)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("priority");

        builder.Property(w => w.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");

        builder.Property(w => w.AssignmentType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .HasColumnName("assignment_type");

        // Text properties
        builder.Property(w => w.Title)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("title");

        builder.Property(w => w.Description)
            .IsRequired()
            .HasMaxLength(2000)
            .HasColumnName("description");

        builder.Property(w => w.PostponementReason)
            .HasMaxLength(500)
            .HasColumnName("postponement_reason");

        builder.Property(w => w.RejectionReason)
            .HasMaxLength(500)
            .HasColumnName("rejection_reason");

        // Boolean and numeric properties
        builder.Property(w => w.RequiresDowntime)
            .IsRequired()
            .HasColumnName("requires_downtime");

        builder.Property(w => w.EstimatedHours)
            .HasColumnType("decimal(10,2)")
            .HasColumnName("estimated_hours");

        builder.Property(w => w.ActualHours)
            .HasColumnType("decimal(10,2)")
            .HasColumnName("actual_hours");

        // Timestamp properties
        builder.Property(w => w.ReportedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("reported_at");

        builder.Property(w => w.ScheduledAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("scheduled_at");

        builder.Property(w => w.StartedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("started_at");

        builder.Property(w => w.CompletedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("completed_at");

        // Assignment tracking
        builder.Property(w => w.AssignedEmployeeId)
            .HasColumnName("assigned_employee_id");
        builder.Property(w => w.AssignedPartnerId)
            .HasColumnName("assigned_partner_id");

        // Owned collection: Parts → work_order_parts table
        builder.OwnsMany(w => w.Parts, parts =>
        {
            parts.ToTable("work_order_parts", "maintenance");
            parts.WithOwner().HasForeignKey("work_order_id");

            parts.Property(p => p.CatalogCode)
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnName("catalog_code");

            parts.Property(p => p.Quantity)
                .IsRequired()
                .HasColumnName("quantity");

            // Money value object configuration (nested owned type)
            parts.OwnsOne(p => p.UnitPrice, unitPrice =>
            {
                unitPrice.Property(m => m.Amount)
                    .HasColumnName("unit_price_amount")
                    .HasColumnType("decimal(10,2)")
                    .IsRequired();

                unitPrice.Property(m => m.Currency)
                    .HasColumnName("unit_price_currency")
                    .HasMaxLength(3)
                    .IsRequired();
            });

            parts.HasIndex("work_order_id")
                .HasDatabaseName("ix_work_order_parts_work_order_id");
        });
    }
}
