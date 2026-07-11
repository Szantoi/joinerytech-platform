namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Migrations;

using Microsoft.EntityFrameworkCore.Migrations;

/// <summary>
/// Initial migration for Kontrolling module.
/// Creates 3 tables:
/// - kontrolling.overhead_configs (OverheadConfig aggregate root)
/// - kontrolling.overhead_rules (owned collection)
/// - kontrolling.cost_adjustments (CostAdjustment aggregate root)
///
/// NOTE: NO table for ProjectCostCalculation — it's calculated on-demand (ADR-055)!
/// </summary>
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Create schema
        migrationBuilder.EnsureSchema(name: "kontrolling");

        // Create overhead_configs table (OverheadConfig aggregate root)
        migrationBuilder.CreateTable(
            name: "overhead_configs",
            schema: "kontrolling",
            columns: table => new
            {
                overhead_config_id = table.Column<Guid>(type: "uuid", nullable: false),
                tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                allocation_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                overhead_rate = table.Column<decimal>(type: "numeric(10,4)", nullable: false),
                updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_by = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_overhead_configs", x => x.overhead_config_id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_overhead_configs_tenant_id_unique",
            schema: "kontrolling",
            table: "overhead_configs",
            column: "tenant_id",
            unique: true);

        // Create overhead_rules table (owned collection of OverheadConfig)
        migrationBuilder.CreateTable(
            name: "overhead_rules",
            schema: "kontrolling",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                overhead_config_id = table.Column<Guid>(type: "uuid", nullable: false),
                cost_category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                exclude = table.Column<bool>(type: "boolean", nullable: false),
                custom_rate = table.Column<decimal>(type: "numeric(10,4)", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_overhead_rules", x => x.id);
                table.ForeignKey(
                    name: "FK_overhead_rules_overhead_configs_overhead_config_id",
                    column: x => x.overhead_config_id,
                    principalSchema: "kontrolling",
                    principalTable: "overhead_configs",
                    principalColumn: "overhead_config_id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_overhead_rules_config_category",
            schema: "kontrolling",
            table: "overhead_rules",
            columns: new[] { "overhead_config_id", "cost_category" });

        // Create cost_adjustments table (CostAdjustment aggregate root)
        migrationBuilder.CreateTable(
            name: "cost_adjustments",
            schema: "kontrolling",
            columns: table => new
            {
                adjustment_id = table.Column<Guid>(type: "uuid", nullable: false),
                tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                project_id = table.Column<Guid>(type: "uuid", nullable: true),
                category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                scope = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                created_by = table.Column<Guid>(type: "uuid", nullable: false),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                deleted_by = table.Column<Guid>(type: "uuid", nullable: true),
                deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_cost_adjustments", x => x.adjustment_id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_cost_adjustments_tenant_id",
            schema: "kontrolling",
            table: "cost_adjustments",
            column: "tenant_id");

        migrationBuilder.CreateIndex(
            name: "ix_cost_adjustments_project_id",
            schema: "kontrolling",
            table: "cost_adjustments",
            column: "project_id");

        migrationBuilder.CreateIndex(
            name: "ix_cost_adjustments_category",
            schema: "kontrolling",
            table: "cost_adjustments",
            column: "category");

        migrationBuilder.CreateIndex(
            name: "ix_cost_adjustments_tenant_project_deleted",
            schema: "kontrolling",
            table: "cost_adjustments",
            columns: new[] { "tenant_id", "project_id", "is_deleted" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "overhead_rules",
            schema: "kontrolling");

        migrationBuilder.DropTable(
            name: "cost_adjustments",
            schema: "kontrolling");

        migrationBuilder.DropTable(
            name: "overhead_configs",
            schema: "kontrolling");
    }
}
