using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.JoineryTech.Domain.Entities;

namespace SpaceOS.Modules.JoineryTech.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core entity configuration for the CatalogCategory entity.
/// Maps to jt_catalog.catalog_categories table with RLS policy enabled.
/// </summary>
public class CatalogCategoryConfiguration : IEntityTypeConfiguration<CatalogCategory>
{
    public void Configure(EntityTypeBuilder<CatalogCategory> builder)
    {
        builder.ToTable("catalog_categories", "jt_catalog");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.TenantId)
            .IsRequired();

        builder.Property(c => c.ParentId)
            .IsRequired(false);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(c => c.Slug)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Description)
            .IsRequired(false);

        builder.Property(c => c.DisplayOrder)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(c => c.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.Property(c => c.CreatedAt)
            .IsRequired()
            .HasDefaultValueSql("NOW()");

        builder.Property(c => c.UpdatedAt)
            .IsRequired()
            .HasDefaultValueSql("NOW()");

        // Indexes
        builder.HasIndex(c => c.TenantId)
            .HasDatabaseName("idx_catalog_categories_tenant");

        builder.HasIndex(c => c.ParentId)
            .HasDatabaseName("idx_catalog_categories_parent");

        builder.HasIndex(c => new { c.TenantId, c.Slug })
            .IsUnique()
            .HasDatabaseName("unique_category_slug_per_tenant");

        // Self-referencing navigation for parent-child relationship
        builder.HasOne(c => c.Parent)
            .WithMany(c => c.Children)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Navigation to tenant
        builder.HasOne(c => c.Tenant)
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // Navigation to catalog items
        builder.HasMany(c => c.Items)
            .WithOne(i => i.Category)
            .HasForeignKey(i => i.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
