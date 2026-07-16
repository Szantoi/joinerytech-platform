using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Configurations;

/// <summary>
/// DocumentCategory aggregate entity type configuration.
/// </summary>
public class DocumentCategoryEntityTypeConfiguration : IEntityTypeConfiguration<DocumentCategory>
{
    public void Configure(EntityTypeBuilder<DocumentCategory> builder)
    {
        builder.ToTable("document_categories", "dms");

        // Primary key
        builder.HasKey(dc => dc.Id);

        // StronglyTypedId conversion
        builder.Property(dc => dc.Id)
            .HasColumnName("id")
            .HasConversion(
                id => id.Value,
                value => new DocumentCategoryId(value)
            )
            .IsRequired();

        // TenantId for RLS (multi-tenancy) — kernel strong id needs an explicit
        // converter (DMS-BE-HOST fix: without it the whole model failed validation)
        builder.Property(dc => dc.TenantId)
            .HasColumnName("tenant_id")
            .HasConversion(
                tenantId => tenantId.Value,
                value => SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(value))
            .IsRequired();

        builder.HasIndex(dc => dc.TenantId)
            .HasDatabaseName("ix_document_categories_tenant_id");

        // Name
        builder.Property(dc => dc.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();

        // Description
        builder.Property(dc => dc.Description)
            .HasColumnName("description")
            .HasMaxLength(1000);

        // IsActive
        builder.Property(dc => dc.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        // Timestamps
        builder.Property(dc => dc.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(dc => dc.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();
    }
}
