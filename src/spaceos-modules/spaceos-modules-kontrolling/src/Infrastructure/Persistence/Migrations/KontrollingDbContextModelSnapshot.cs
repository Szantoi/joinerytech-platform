namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Migrations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence;

/// <summary>
/// EF Core model snapshot for KontrollingDbContext.
/// Represents the current state of the database schema.
/// </summary>
[DbContext(typeof(KontrollingDbContext))]
partial class KontrollingDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultSchema("kontrolling")
            .HasAnnotation("ProductVersion", "8.0.0");

        // OverheadConfig aggregate root
        modelBuilder.Entity("SpaceOS.Modules.Kontrolling.Domain.Aggregates.OverheadConfig", b =>
        {
            b.Property<Guid>("OverheadConfigId")
                .HasColumnType("uuid")
                .HasColumnName("overhead_config_id");

            b.Property<string>("AllocationMethod")
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnType("character varying(50)")
                .HasColumnName("allocation_method");

            b.Property<decimal>("OverheadRate")
                .HasColumnType("numeric(10,4)")
                .HasColumnName("overhead_rate");

            b.Property<Guid>("TenantId")
                .HasColumnType("uuid")
                .HasColumnName("tenant_id");

            b.Property<DateTime>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.Property<Guid>("UpdatedBy")
                .HasColumnType("uuid")
                .HasColumnName("updated_by");

            b.HasKey("OverheadConfigId");

            b.HasIndex("TenantId")
                .IsUnique()
                .HasDatabaseName("ix_overhead_configs_tenant_id_unique");

            b.ToTable("overhead_configs", "kontrolling");

            // Owned collection: OverheadRules
            b.OwnsMany("SpaceOS.Modules.Kontrolling.Domain.ValueObjects.OverheadRule", "OverheadRules", b1 =>
            {
                b1.Property<Guid>("id")
                    .HasColumnType("uuid")
                    .HasColumnName("id");

                b1.Property<string>("CostCategory")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasColumnType("character varying(50)")
                    .HasColumnName("cost_category");

                b1.Property<decimal?>("CustomRate")
                    .HasColumnType("numeric(10,4)")
                    .HasColumnName("custom_rate");

                b1.Property<bool>("Exclude")
                    .HasColumnType("boolean")
                    .HasColumnName("exclude");

                b1.HasKey("id");

                b1.HasIndex("overhead_config_id", "cost_category")
                    .HasDatabaseName("ix_overhead_rules_config_category");

                b1.ToTable("overhead_rules", "kontrolling");

                b1.WithOwner()
                    .HasForeignKey("overhead_config_id");
            });

            b.Navigation("OverheadRules");
        });

        // CostAdjustment aggregate root
        modelBuilder.Entity("SpaceOS.Modules.Kontrolling.Domain.Entities.CostAdjustment", b =>
        {
            b.Property<Guid>("AdjustmentId")
                .HasColumnType("uuid")
                .HasColumnName("adjustment_id");

            b.Property<string>("Category")
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnType("character varying(50)")
                .HasColumnName("category");

            b.Property<DateTime>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<Guid>("CreatedBy")
                .HasColumnType("uuid")
                .HasColumnName("created_by");

            b.Property<DateTime?>("DeletedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("deleted_at");

            b.Property<Guid?>("DeletedBy")
                .HasColumnType("uuid")
                .HasColumnName("deleted_by");

            b.Property<bool>("IsDeleted")
                .ValueGeneratedOnAdd()
                .HasColumnType("boolean")
                .HasDefaultValue(false)
                .HasColumnName("is_deleted");

            b.Property<Guid?>("ProjectId")
                .HasColumnType("uuid")
                .HasColumnName("project_id");

            b.Property<string>("Reason")
                .IsRequired()
                .HasMaxLength(500)
                .HasColumnType("character varying(500)")
                .HasColumnName("reason");

            b.Property<string>("Scope")
                .IsRequired()
                .HasMaxLength(20)
                .HasColumnType("character varying(20)")
                .HasColumnName("scope");

            b.Property<Guid>("TenantId")
                .HasColumnType("uuid")
                .HasColumnName("tenant_id");

            b.HasKey("AdjustmentId");

            b.HasIndex("Category")
                .HasDatabaseName("ix_cost_adjustments_category");

            b.HasIndex("ProjectId")
                .HasDatabaseName("ix_cost_adjustments_project_id");

            b.HasIndex("TenantId")
                .HasDatabaseName("ix_cost_adjustments_tenant_id");

            b.HasIndex("TenantId", "ProjectId", "IsDeleted")
                .HasDatabaseName("ix_cost_adjustments_tenant_project_deleted");

            b.ToTable("cost_adjustments", "kontrolling");

            // Owned type: Money value object
            b.OwnsOne("SpaceOS.Modules.Kontrolling.Domain.ValueObjects.Money", "Amount", b1 =>
            {
                b1.Property<decimal>("Amount")
                    .HasColumnType("numeric(18,2)")
                    .HasColumnName("amount");

                b1.Property<string>("Currency")
                    .IsRequired()
                    .HasMaxLength(3)
                    .HasColumnType("character varying(3)")
                    .HasColumnName("currency");
            });

            b.Navigation("Amount")
                .IsRequired();
        });
    }
}
