using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.JoineryTech.Domain.Entities;

namespace SpaceOS.Modules.JoineryTech.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core entity configuration for the CatalogItem entity.
/// Maps to jt_catalog.catalog_items table with RLS policy enabled.
/// </summary>
public class CatalogItemConfiguration : IEntityTypeConfiguration<CatalogItem>
{
    public void Configure(EntityTypeBuilder<CatalogItem> builder)
    {
        builder.ToTable("catalog_items", "jt_catalog");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.TenantId)
            .IsRequired();

        builder.Property(i => i.CategoryId)
            .IsRequired(false);

        builder.Property(i => i.Name)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(i => i.Sku)
            .HasMaxLength(100);

        builder.Property(i => i.Description)
            .IsRequired(false);

        builder.Property(i => i.BasePrice)
            .HasPrecision(12, 2);

        builder.Property(i => i.Unit)
            .HasMaxLength(50)
            .HasDefaultValue("unit");

        builder.Property(i => i.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.Property(i => i.MetadataJson)
            .HasColumnName("metadata")
            .HasColumnType("jsonb")
            .HasDefaultValue("{}");

        builder.Property(i => i.CreatedAt)
            .IsRequired()
            .HasDefaultValueSql("NOW()");

        builder.Property(i => i.UpdatedAt)
            .IsRequired()
            .HasDefaultValueSql("NOW()");

        // Indexes
        builder.HasIndex(i => new { i.TenantId, i.Status })
            .HasDatabaseName("idx_catalog_items_tenant_status");

        builder.HasIndex(i => i.CategoryId)
            .HasDatabaseName("idx_catalog_items_category");

        builder.HasIndex(i => new { i.TenantId, i.Sku })
            .IsUnique()
            .HasDatabaseName("unique_sku_per_tenant")
            .HasFilter("sku IS NOT NULL");

        // Full-text search index for name (handled by SQL migration)
        // CREATE INDEX idx_catalog_items_name_search ON jt_catalog.catalog_items USING gin(to_tsvector('hungarian', name));

        // Navigation
        builder.HasOne(i => i.Tenant)
            .WithMany()
            .HasForeignKey(i => i.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Category)
            .WithMany(c => c.Items)
            .HasForeignKey(i => i.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
