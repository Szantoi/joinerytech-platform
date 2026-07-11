using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.Maintenance.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "maintenance");

            migrationBuilder.CreateTable(
                name: "assets",
                schema: "maintenance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    facility_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    vendor = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    operating_hours = table.Column<decimal>(type: "numeric(15,2)", nullable: false),
                    machine_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    vehicle_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    retired = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "work_orders",
                schema: "maintenance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    priority = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    requires_downtime = table.Column<bool>(type: "boolean", nullable: false),
                    estimated_hours = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    actual_hours = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    reported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    assignment_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    assigned_employee_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assigned_partner_id = table.Column<Guid>(type: "uuid", nullable: true),
                    postponement_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    rejection_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_orders", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "asset_maintenance_plans",
                schema: "maintenance",
                columns: table => new
                {
                    asset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    id = table.Column<string>(type: "text", nullable: false),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    trigger = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    interval_days = table.Column<int>(type: "integer", nullable: true),
                    interval_hours = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    estimated_hours = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    last_done = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_done_hours = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    assignee_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    assignee_employee_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_maintenance_plans", x => new { x.asset_id, x.id });
                    table.ForeignKey(
                        name: "FK_asset_maintenance_plans_assets_asset_id",
                        column: x => x.asset_id,
                        principalSchema: "maintenance",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_order_parts",
                schema: "maintenance",
                columns: table => new
                {
                    work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    id = table.Column<string>(type: "text", nullable: false),
                    catalog_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_price_amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    unit_price_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_order_parts", x => new { x.work_order_id, x.id });
                    table.ForeignKey(
                        name: "FK_work_order_parts_work_orders_work_order_id",
                        column: x => x.work_order_id,
                        principalSchema: "maintenance",
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_assets_facility_id",
                schema: "maintenance",
                table: "assets",
                column: "facility_id");

            migrationBuilder.CreateIndex(
                name: "ix_assets_tenant_id",
                schema: "maintenance",
                table: "assets",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_maintenance_plans_asset_id",
                schema: "maintenance",
                table: "asset_maintenance_plans",
                column: "asset_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_orders_asset_id",
                schema: "maintenance",
                table: "work_orders",
                column: "asset_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_orders_tenant_id",
                schema: "maintenance",
                table: "work_orders",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_order_parts_work_order_id",
                schema: "maintenance",
                table: "work_order_parts",
                column: "work_order_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "asset_maintenance_plans",
                schema: "maintenance");

            migrationBuilder.DropTable(
                name: "work_order_parts",
                schema: "maintenance");

            migrationBuilder.DropTable(
                name: "assets",
                schema: "maintenance");

            migrationBuilder.DropTable(
                name: "work_orders",
                schema: "maintenance");
        }
    }
}
