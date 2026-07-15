using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for HazardousMaterial aggregate (SDS registry).
/// SdsValidity is calculated in the domain — it has NO column.
/// </summary>
public class HazardousMaterialEntityTypeConfiguration : IEntityTypeConfiguration<HazardousMaterial>
{
    public void Configure(EntityTypeBuilder<HazardousMaterial> builder)
    {
        builder.ToTable("hazardous_materials", "ehs");
        builder.HasKey(m => m.MaterialId);

        builder.Property(m => m.MaterialId)
            .IsRequired()
            .HasColumnName("material_id");

        // TenantId for RLS
        builder.Property(m => m.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(m => m.TenantId)
            .HasDatabaseName("ix_hazardous_materials_tenant_id");

        builder.Property(m => m.Name)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("name");

        builder.Property(m => m.Supplier)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("supplier");

        builder.Property(m => m.CasNumber)
            .HasMaxLength(50)
            .HasColumnName("cas_number");

        // GHS pictogram codes — Npgsql maps List<string> to text[]
        builder.Property(m => m.GhsHazardClasses)
            .HasColumnName("ghs_hazard_classes");

        builder.Property(m => m.StorageLocationId)
            .IsRequired()
            .HasColumnName("storage_location_id");
        builder.HasIndex(m => m.StorageLocationId)
            .HasDatabaseName("ix_hazardous_materials_storage_location_id");

        builder.Property(m => m.QuantityOnSite)
            .IsRequired()
            .HasPrecision(18, 3)
            .HasColumnName("quantity_on_site");

        builder.Property(m => m.Unit)
            .IsRequired()
            .HasMaxLength(20)
            .HasColumnName("unit");

        builder.Property(m => m.SdsDocumentId)
            .HasColumnName("sds_document_id");

        builder.Property(m => m.SdsIssuedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("sds_issued_at");

        builder.Property(m => m.SdsExpiresAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("sds_expires_at");
        builder.HasIndex(m => m.SdsExpiresAt)
            .HasDatabaseName("ix_hazardous_materials_sds_expires_at");

        builder.Property(m => m.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");

        builder.Property(m => m.RegisteredAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("registered_at");

        // Calculated property — never stored
        builder.Ignore(m => m.SdsValidity);
    }
}
