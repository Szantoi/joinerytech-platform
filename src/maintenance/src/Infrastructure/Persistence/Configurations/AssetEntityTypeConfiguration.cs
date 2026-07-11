using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Configurations;

/// <summary>
/// Entity Type Configuration for Asset aggregate.
/// Maps Asset with owned collection MaintenancePlans and RLS support.
/// </summary>
public class AssetEntityTypeConfiguration : IEntityTypeConfiguration<Asset>
{
    public void Configure(EntityTypeBuilder<Asset> builder)
    {
        builder.ToTable("assets", "maintenance");
        builder.HasKey(a => a.Id);

        // StronglyTypedId conversion (DMS pattern)
        builder.Property(a => a.Id)
            .HasConversion(
                id => id.Value,
                value => new AssetId(value))
            .HasColumnName("id");

        // TenantId for RLS
        builder.Property(a => a.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(a => a.TenantId)
            .HasDatabaseName("ix_assets_tenant_id");

        // Basic properties with constraints
        builder.Property(a => a.Code)
            .IsRequired()
            .HasMaxLength(50)
            .HasColumnName("code");

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("name");

        builder.Property(a => a.Location)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("location");

        builder.Property(a => a.Vendor)
            .HasMaxLength(100)
            .HasColumnName("vendor");

        builder.Property(a => a.Model)
            .HasMaxLength(100)
            .HasColumnName("model");

        builder.Property(a => a.FacilityId)
            .HasColumnName("facility_id");

        // Enum conversions
        builder.Property(a => a.Kind)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("kind");

        // Numeric properties
        builder.Property(a => a.OperatingHours)
            .HasColumnType("decimal(15,2)")
            .HasColumnName("operating_hours");

        // Optional FK properties
        builder.Property(a => a.MachineId)
            .HasMaxLength(100)
            .HasColumnName("machine_id");

        builder.Property(a => a.VehicleId)
            .HasMaxLength(100)
            .HasColumnName("vehicle_id");

        builder.Property(a => a.Retired)
            .IsRequired()
            .HasColumnName("retired");

        // Index on FacilityId for efficient queries
        builder.HasIndex(a => a.FacilityId)
            .HasDatabaseName("ix_assets_facility_id");

        // Owned collection: MaintenancePlans → asset_maintenance_plans table
        builder.OwnsMany(a => a.MaintenancePlans, plans =>
        {
            plans.ToTable("asset_maintenance_plans", "maintenance");
            plans.WithOwner().HasForeignKey("asset_id");

            plans.Property(p => p.Label)
                .IsRequired()
                .HasMaxLength(200)
                .HasColumnName("label");

            plans.Property(p => p.Trigger)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired()
                .HasColumnName("trigger");

            plans.Property(p => p.IntervalDays)
                .HasColumnName("interval_days");

            plans.Property(p => p.IntervalHours)
                .HasColumnType("decimal(10,2)")
                .HasColumnName("interval_hours");

            plans.Property(p => p.EstimatedHours)
                .HasColumnType("decimal(10,2)")
                .IsRequired()
                .HasColumnName("estimated_hours");

            plans.Property(p => p.LastDone)
                .HasColumnName("last_done");

            plans.Property(p => p.LastDoneHours)
                .HasColumnType("decimal(10,2)")
                .HasColumnName("last_done_hours");

            plans.Property(p => p.AssigneeType)
                .HasConversion<string>()
                .HasMaxLength(50)
                .HasColumnName("assignee_type");

            plans.Property(p => p.AssigneeEmployeeId)
                .HasColumnName("assignee_employee_id");

            plans.HasIndex("asset_id")
                .HasDatabaseName("ix_asset_maintenance_plans_asset_id");
        });
    }
}
