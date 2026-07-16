using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Configurations;

/// <summary>
/// Tag value object entity type configuration.
/// </summary>
public class TagEntityTypeConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("tags", "dms");

        // Primary key
        builder.HasKey(t => t.Id);

        // StronglyTypedId conversion
        builder.Property(t => t.Id)
            .HasColumnName("id")
            .HasConversion(
                id => id.Value,
                value => new TagId(value)
            )
            .IsRequired();

        // TenantId for RLS (multi-tenancy) — kernel strong id needs an explicit
        // converter (DMS-BE-HOST fix: without it the whole model failed validation)
        builder.Property(t => t.TenantId)
            .HasColumnName("tenant_id")
            .HasConversion(
                tenantId => tenantId.Value,
                value => SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(value))
            .IsRequired();

        builder.HasIndex(t => t.TenantId)
            .HasDatabaseName("ix_tags_tenant_id");

        // Name
        builder.Property(t => t.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();

        // Color (optional)
        builder.Property(t => t.Color)
            .HasColumnName("color")
            .HasMaxLength(7);

        // Timestamps
        builder.Property(t => t.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(t => t.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();
    }
}
