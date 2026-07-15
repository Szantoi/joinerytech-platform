using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for EhsLocation aggregate (hierarchical registry).
/// The tree is self-referencing through parent_location_id.
/// </summary>
public class EhsLocationEntityTypeConfiguration : IEntityTypeConfiguration<EhsLocation>
{
    public void Configure(EntityTypeBuilder<EhsLocation> builder)
    {
        builder.ToTable("locations", "ehs");
        builder.HasKey(l => l.LocationId);

        builder.Property(l => l.LocationId)
            .IsRequired()
            .HasColumnName("location_id");

        // TenantId for RLS
        builder.Property(l => l.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(l => l.TenantId)
            .HasDatabaseName("ix_locations_tenant_id");

        builder.Property(l => l.Code)
            .IsRequired()
            .HasMaxLength(50)
            .HasColumnName("code");

        builder.Property(l => l.Name)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("name");

        builder.Property(l => l.ParentLocationId)
            .HasColumnName("parent_location_id");
        builder.HasIndex(l => l.ParentLocationId)
            .HasDatabaseName("ix_locations_parent_location_id");

        builder.Property(l => l.Kind)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("kind");

        builder.Property(l => l.IsActive)
            .IsRequired()
            .HasColumnName("is_active");

        builder.Property(l => l.CreatedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("created_at");

        // Code is unique per tenant
        builder.HasIndex(l => new { l.TenantId, l.Code })
            .IsUnique()
            .HasDatabaseName("ux_locations_tenant_code");
    }
}
