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
            .HasConversion(
                id => id.Value,
                value => new TagId(value)
            )
            .IsRequired();

        // TenantId for RLS (multi-tenancy)
        builder.Property(t => t.TenantId)
            .IsRequired();

        builder.HasIndex(t => t.TenantId)
            .HasDatabaseName("ix_tags_tenant_id");

        // Name
        builder.Property(t => t.Name)
            .HasMaxLength(100)
            .IsRequired();

        // Color (optional)
        builder.Property(t => t.Color)
            .HasMaxLength(7);

        // Timestamps
        builder.Property(t => t.CreatedAt)
            .IsRequired();

        builder.Property(t => t.UpdatedAt)
            .IsRequired();
    }
}
