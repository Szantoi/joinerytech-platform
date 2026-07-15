using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for PpeItem aggregate (PPE catalogue).
/// </summary>
public class PpeItemEntityTypeConfiguration : IEntityTypeConfiguration<PpeItem>
{
    public void Configure(EntityTypeBuilder<PpeItem> builder)
    {
        builder.ToTable("ppe_items", "ehs");
        builder.HasKey(i => i.PpeItemId);

        builder.Property(i => i.PpeItemId)
            .IsRequired()
            .HasColumnName("ppe_item_id");

        // TenantId for RLS
        builder.Property(i => i.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(i => i.TenantId)
            .HasDatabaseName("ix_ppe_items_tenant_id");

        builder.Property(i => i.Name)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("name");

        builder.Property(i => i.Category)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("category");

        builder.Property(i => i.StandardRef)
            .HasMaxLength(100)
            .HasColumnName("standard_ref");

        builder.Property(i => i.DefaultLifetimeMonths)
            .HasColumnName("default_lifetime_months");

        builder.Property(i => i.IsActive)
            .IsRequired()
            .HasColumnName("is_active");

        builder.Property(i => i.CreatedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("created_at");
    }
}
