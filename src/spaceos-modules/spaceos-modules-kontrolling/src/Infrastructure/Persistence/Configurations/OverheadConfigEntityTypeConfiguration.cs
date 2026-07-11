namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;

/// <summary>
/// Entity type configuration for OverheadConfig aggregate.
/// Includes owned collection: OverheadRules
/// </summary>
public sealed class OverheadConfigEntityTypeConfiguration : IEntityTypeConfiguration<OverheadConfig>
{
    public void Configure(EntityTypeBuilder<OverheadConfig> builder)
    {
        builder.ToTable("overhead_configs");

        // Primary key
        builder.HasKey(o => o.OverheadConfigId);
        builder.Property(o => o.OverheadConfigId)
            .HasColumnName("overhead_config_id")
            .IsRequired();

        // Tenant ID (unique: one config per tenant)
        builder.Property(o => o.TenantId)
            .HasColumnName("tenant_id")
            .IsRequired();

        builder.HasIndex(o => o.TenantId)
            .IsUnique()
            .HasDatabaseName("ix_overhead_configs_tenant_id_unique");

        // Allocation method (enum as string)
        builder.Property(o => o.AllocationMethod)
            .HasConversion<string>()
            .HasColumnName("allocation_method")
            .HasMaxLength(50)
            .IsRequired();

        // Overhead rate (decimal 0.0-1.0 for percentage, or hourly rate)
        builder.Property(o => o.OverheadRate)
            .HasColumnName("overhead_rate")
            .HasColumnType("decimal(10,4)")
            .IsRequired();

        // Audit fields
        builder.Property(o => o.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        builder.Property(o => o.UpdatedBy)
            .HasColumnName("updated_by")
            .IsRequired();

        // Owned collection: OverheadRules (separate table)
        builder.OwnsMany(o => o.OverheadRules, rules =>
        {
            rules.ToTable("overhead_rules");

            // Foreign key to parent (OverheadConfig)
            rules.WithOwner().HasForeignKey("overhead_config_id");

            // Primary key for OverheadRule rows
            rules.Property<Guid>("id")
                .HasColumnName("id")
                .IsRequired();

            rules.HasKey("id");

            // CostCategory (enum as string)
            rules.Property(r => r.CostCategory)
                .HasConversion<string>()
                .HasColumnName("cost_category")
                .HasMaxLength(50)
                .IsRequired();

            // Exclude flag
            rules.Property(r => r.Exclude)
                .HasColumnName("exclude")
                .IsRequired();

            // Custom rate (nullable decimal)
            rules.Property(r => r.CustomRate)
                .HasColumnName("custom_rate")
                .HasColumnType("decimal(10,4)");

            // Index on cost category for faster lookups
            rules.HasIndex("overhead_config_id", "cost_category")
                .HasDatabaseName("ix_overhead_rules_config_category");
        });
    }
}
