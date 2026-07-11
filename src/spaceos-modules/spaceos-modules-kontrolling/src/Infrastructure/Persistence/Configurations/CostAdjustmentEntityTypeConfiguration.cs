namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Kontrolling.Domain.Entities;

/// <summary>
/// Entity type configuration for CostAdjustment aggregate.
/// Includes Money value object mapping.
/// </summary>
public sealed class CostAdjustmentEntityTypeConfiguration : IEntityTypeConfiguration<CostAdjustment>
{
    public void Configure(EntityTypeBuilder<CostAdjustment> builder)
    {
        builder.ToTable("cost_adjustments");

        // Primary key
        builder.HasKey(c => c.AdjustmentId);
        builder.Property(c => c.AdjustmentId)
            .HasColumnName("adjustment_id")
            .IsRequired();

        // Tenant ID
        builder.Property(c => c.TenantId)
            .HasColumnName("tenant_id")
            .IsRequired();

        builder.HasIndex(c => c.TenantId)
            .HasDatabaseName("ix_cost_adjustments_tenant_id");

        // Project ID (nullable: global or project-scoped)
        builder.Property(c => c.ProjectId)
            .HasColumnName("project_id");

        builder.HasIndex(c => c.ProjectId)
            .HasDatabaseName("ix_cost_adjustments_project_id");

        // Cost category (enum as string)
        builder.Property(c => c.Category)
            .HasConversion<string>()
            .HasColumnName("category")
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(c => c.Category)
            .HasDatabaseName("ix_cost_adjustments_category");

        // Money value object (owned type as columns)
        builder.OwnsOne(c => c.Amount, amount =>
        {
            amount.Property(m => m.Amount)
                .HasColumnName("amount")
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            amount.Property(m => m.Currency)
                .HasColumnName("currency")
                .HasMaxLength(3)
                .IsRequired();
        });

        // Adjustment scope (enum as string)
        builder.Property(c => c.Scope)
            .HasConversion<string>()
            .HasColumnName("scope")
            .HasMaxLength(20)
            .IsRequired();

        // Reason (text field)
        builder.Property(c => c.Reason)
            .HasColumnName("reason")
            .HasMaxLength(500)
            .IsRequired();

        // Audit fields
        builder.Property(c => c.CreatedBy)
            .HasColumnName("created_by")
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        // Soft delete
        builder.Property(c => c.IsDeleted)
            .HasColumnName("is_deleted")
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(c => c.DeletedBy)
            .HasColumnName("deleted_by");

        builder.Property(c => c.DeletedAt)
            .HasColumnName("deleted_at");

        builder.HasQueryFilter(c => !c.IsDeleted);

        // Composite index for tenant + project queries
        builder.HasIndex(c => new { c.TenantId, c.ProjectId, c.IsDeleted })
            .HasDatabaseName("ix_cost_adjustments_tenant_project_deleted");
    }
}
