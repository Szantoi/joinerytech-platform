using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.QA.src.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "qa");

            migrationBuilder.CreateTable(
                name: "inspections",
                schema: "qa",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    checkpoint_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    product_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    result = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    inspector_id = table.Column<Guid>(type: "uuid", nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    planned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inspections", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "qa_checkpoints",
                schema: "qa",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    checkpoint_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    critical_level = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qa_checkpoints", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inspection_defects",
                schema: "qa",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: false),
                    inspection_id = table.Column<Guid>(type: "uuid", nullable: false),
                    failure_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    photo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inspection_defects", x => new { x.inspection_id, x.id });
                    table.ForeignKey(
                        name: "FK_inspection_defects_inspections_inspection_id",
                        column: x => x.inspection_id,
                        principalSchema: "qa",
                        principalTable: "inspections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "qa_checkpoint_criteria",
                schema: "qa",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: false),
                    qa_checkpoint_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    acceptance_threshold = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qa_checkpoint_criteria", x => new { x.qa_checkpoint_id, x.id });
                    table.ForeignKey(
                        name: "FK_qa_checkpoint_criteria_qa_checkpoints_qa_checkpoint_id",
                        column: x => x.qa_checkpoint_id,
                        principalSchema: "qa",
                        principalTable: "qa_checkpoints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_inspection_defects_inspection_id",
                schema: "qa",
                table: "inspection_defects",
                column: "inspection_id");

            migrationBuilder.CreateIndex(
                name: "ix_inspections_checkpoint_id",
                schema: "qa",
                table: "inspections",
                column: "checkpoint_id");

            migrationBuilder.CreateIndex(
                name: "ix_inspections_tenant_id",
                schema: "qa",
                table: "inspections",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_qa_checkpoint_criteria_qa_checkpoint_id",
                schema: "qa",
                table: "qa_checkpoint_criteria",
                column: "qa_checkpoint_id");

            migrationBuilder.CreateIndex(
                name: "ix_qa_checkpoints_tenant_id",
                schema: "qa",
                table: "qa_checkpoints",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inspection_defects",
                schema: "qa");

            migrationBuilder.DropTable(
                name: "qa_checkpoint_criteria",
                schema: "qa");

            migrationBuilder.DropTable(
                name: "inspections",
                schema: "qa");

            migrationBuilder.DropTable(
                name: "qa_checkpoints",
                schema: "qa");
        }
    }
}
