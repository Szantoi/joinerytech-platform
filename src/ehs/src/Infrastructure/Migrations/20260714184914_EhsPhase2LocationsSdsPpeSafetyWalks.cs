using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.Ehs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EhsPhase2LocationsSdsPpeSafetyWalks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── UNIFIED CAPA promotion (data-preserving, hand-adjusted) ──────
            // The scaffolder proposed DropTable+CreateTable which would lose
            // every existing incident CAPA. Instead: rename the owned table to
            // the unified "corrective_actions", drop the old composite PK and
            // shadow FK column, add the unified columns, and backfill
            // tenant_id/source/source_id from the parent incidents.
            migrationBuilder.DropForeignKey(
                name: "FK_incident_corrective_actions_incidents_incident_id1",
                schema: "ehs",
                table: "incident_corrective_actions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_incident_corrective_actions",
                schema: "ehs",
                table: "incident_corrective_actions");

            migrationBuilder.RenameTable(
                name: "incident_corrective_actions",
                schema: "ehs",
                newName: "corrective_actions",
                newSchema: "ehs");

            // Old shadow FK column (its index is dropped together with it)
            migrationBuilder.DropColumn(
                name: "incident_id1",
                schema: "ehs",
                table: "corrective_actions");

            // incident_id becomes nullable — safety-walk CAPAs have no incident
            migrationBuilder.AlterColumn<Guid>(
                name: "incident_id",
                schema: "ehs",
                table: "corrective_actions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "tenant_id",
                schema: "ehs",
                table: "corrective_actions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "source",
                schema: "ehs",
                table: "corrective_actions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Incident");

            migrationBuilder.AddColumn<Guid>(
                name: "source_id",
                schema: "ehs",
                table: "corrective_actions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "finding_id",
                schema: "ehs",
                table: "corrective_actions",
                type: "uuid",
                nullable: true);

            // Backfill: every pre-existing row was spawned by an incident
            migrationBuilder.Sql(@"
                UPDATE ehs.corrective_actions ca
                SET tenant_id = i.tenant_id,
                    source    = 'Incident',
                    source_id = ca.incident_id
                FROM ehs.incidents i
                WHERE i.incident_id = ca.incident_id;
            ");

            migrationBuilder.AddPrimaryKey(
                name: "PK_corrective_actions",
                schema: "ehs",
                table: "corrective_actions",
                column: "corrective_action_id");

            migrationBuilder.AddForeignKey(
                name: "FK_corrective_actions_incidents_incident_id",
                schema: "ehs",
                table: "corrective_actions",
                column: "incident_id",
                principalSchema: "ehs",
                principalTable: "incidents",
                principalColumn: "incident_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.CreateTable(
                name: "hazardous_materials",
                schema: "ehs",
                columns: table => new
                {
                    material_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    supplier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    cas_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ghs_hazard_classes = table.Column<List<string>>(type: "text[]", nullable: false),
                    storage_location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity_on_site = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    sds_document_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sds_issued_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sds_expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    registered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hazardous_materials", x => x.material_id);
                });

            migrationBuilder.CreateTable(
                name: "locations",
                schema: "ehs",
                columns: table => new
                {
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    parent_location_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_locations", x => x.location_id);
                });

            migrationBuilder.CreateTable(
                name: "ppe_issuances",
                schema: "ehs",
                columns: table => new
                {
                    issuance_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ppe_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    issued_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    issued_by = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    acknowledged_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    returned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    replaced_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    replacement_issuance_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ppe_issuances", x => x.issuance_id);
                });

            migrationBuilder.CreateTable(
                name: "ppe_items",
                schema: "ehs",
                columns: table => new
                {
                    ppe_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    standard_ref = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    default_lifetime_months = table.Column<int>(type: "integer", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ppe_items", x => x.ppe_item_id);
                });

            migrationBuilder.CreateTable(
                name: "safety_walks",
                schema: "ehs",
                columns: table => new
                {
                    safety_walk_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduled_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    conducted_by = table.Column<Guid>(type: "uuid", nullable: false),
                    participants = table.Column<List<Guid>>(type: "uuid[]", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    cancelled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safety_walks", x => x.safety_walk_id);
                });

            migrationBuilder.CreateTable(
                name: "safety_walk_findings",
                schema: "ehs",
                columns: table => new
                {
                    finding_id = table.Column<Guid>(type: "uuid", nullable: false),
                    safety_walk_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    severity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    photo_s3_key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    requires_action = table.Column<bool>(type: "boolean", nullable: false),
                    corrective_action_id = table.Column<Guid>(type: "uuid", nullable: true),
                    linked_risk_assessment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    recorded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safety_walk_findings", x => x.finding_id);
                    table.ForeignKey(
                        name: "FK_safety_walk_findings_safety_walks_safety_walk_id",
                        column: x => x.safety_walk_id,
                        principalSchema: "ehs",
                        principalTable: "safety_walks",
                        principalColumn: "safety_walk_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_corrective_actions_assigned_to",
                schema: "ehs",
                table: "corrective_actions",
                column: "assigned_to");

            migrationBuilder.CreateIndex(
                name: "ix_corrective_actions_incident_id",
                schema: "ehs",
                table: "corrective_actions",
                column: "incident_id");

            migrationBuilder.CreateIndex(
                name: "ix_corrective_actions_source",
                schema: "ehs",
                table: "corrective_actions",
                column: "source");

            migrationBuilder.CreateIndex(
                name: "ix_corrective_actions_source_id",
                schema: "ehs",
                table: "corrective_actions",
                column: "source_id");

            migrationBuilder.CreateIndex(
                name: "ix_corrective_actions_tenant_id",
                schema: "ehs",
                table: "corrective_actions",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_hazardous_materials_sds_expires_at",
                schema: "ehs",
                table: "hazardous_materials",
                column: "sds_expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_hazardous_materials_storage_location_id",
                schema: "ehs",
                table: "hazardous_materials",
                column: "storage_location_id");

            migrationBuilder.CreateIndex(
                name: "ix_hazardous_materials_tenant_id",
                schema: "ehs",
                table: "hazardous_materials",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_locations_parent_location_id",
                schema: "ehs",
                table: "locations",
                column: "parent_location_id");

            migrationBuilder.CreateIndex(
                name: "ix_locations_tenant_id",
                schema: "ehs",
                table: "locations",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ux_locations_tenant_code",
                schema: "ehs",
                table: "locations",
                columns: new[] { "tenant_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ppe_issuances_employee_id",
                schema: "ehs",
                table: "ppe_issuances",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_ppe_issuances_ppe_item_id",
                schema: "ehs",
                table: "ppe_issuances",
                column: "ppe_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_ppe_issuances_status",
                schema: "ehs",
                table: "ppe_issuances",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_ppe_issuances_tenant_id",
                schema: "ehs",
                table: "ppe_issuances",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_ppe_items_tenant_id",
                schema: "ehs",
                table: "ppe_items",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_safety_walk_findings_safety_walk_id",
                schema: "ehs",
                table: "safety_walk_findings",
                column: "safety_walk_id");

            migrationBuilder.CreateIndex(
                name: "ix_safety_walks_location_id",
                schema: "ehs",
                table: "safety_walks",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "ix_safety_walks_status",
                schema: "ehs",
                table: "safety_walks",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_safety_walks_tenant_id",
                schema: "ehs",
                table: "safety_walks",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hazardous_materials",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "locations",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "ppe_issuances",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "ppe_items",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "safety_walk_findings",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "safety_walks",
                schema: "ehs");

            // ── UNIFIED CAPA rollback (data-preserving, hand-adjusted) ───────
            // Non-incident CAPAs cannot exist in the old owned-table schema.
            migrationBuilder.Sql("DELETE FROM ehs.corrective_actions WHERE incident_id IS NULL;");

            migrationBuilder.DropForeignKey(
                name: "FK_corrective_actions_incidents_incident_id",
                schema: "ehs",
                table: "corrective_actions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_corrective_actions",
                schema: "ehs",
                table: "corrective_actions");

            migrationBuilder.DropColumn(name: "tenant_id", schema: "ehs", table: "corrective_actions");
            migrationBuilder.DropColumn(name: "source", schema: "ehs", table: "corrective_actions");
            migrationBuilder.DropColumn(name: "source_id", schema: "ehs", table: "corrective_actions");
            migrationBuilder.DropColumn(name: "finding_id", schema: "ehs", table: "corrective_actions");

            migrationBuilder.AlterColumn<Guid>(
                name: "incident_id",
                schema: "ehs",
                table: "corrective_actions",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "incident_id1",
                schema: "ehs",
                table: "corrective_actions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql("UPDATE ehs.corrective_actions SET incident_id1 = incident_id;");

            migrationBuilder.RenameTable(
                name: "corrective_actions",
                schema: "ehs",
                newName: "incident_corrective_actions",
                newSchema: "ehs");

            migrationBuilder.AddPrimaryKey(
                name: "PK_incident_corrective_actions",
                schema: "ehs",
                table: "incident_corrective_actions",
                columns: new[] { "incident_id1", "corrective_action_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_incident_corrective_actions_incidents_incident_id1",
                schema: "ehs",
                table: "incident_corrective_actions",
                column: "incident_id1",
                principalSchema: "ehs",
                principalTable: "incidents",
                principalColumn: "incident_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.CreateIndex(
                name: "ix_incident_corrective_actions_incident_id",
                schema: "ehs",
                table: "incident_corrective_actions",
                column: "incident_id1");
        }
    }
}
