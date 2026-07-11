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
            .HasConversion(
                id => id.Value,
                value => new DocumentCategoryId(value)
            )
            .IsRequired();

        // TenantId for RLS (multi-tenancy)
        builder.Property(dc => dc.TenantId)
            .IsRequired();

        builder.HasIndex(dc => dc.TenantId)
            .HasDatabaseName("ix_document_categories_tenant_id");

        // Name
        builder.Property(dc => dc.Name)
            .HasMaxLength(200)
            .IsRequired();

        // Description
        builder.Property(dc => dc.Description)
            .HasMaxLength(1000);

        // IsActive
        builder.Property(dc => dc.IsActive)
            .IsRequired();

        // Timestamps
        builder.Property(dc => dc.CreatedAt)
            .IsRequired();

        builder.Property(dc => dc.UpdatedAt)
            .IsRequired();
    }
}
