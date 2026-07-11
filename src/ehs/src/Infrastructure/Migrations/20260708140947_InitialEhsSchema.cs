using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.Ehs.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialEhsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "ehs");

            migrationBuilder.CreateTable(
                name: "incidents",
                schema: "ehs",
                columns: table => new
                {
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    incident_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    severity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reported_by = table.Column<Guid>(type: "uuid", nullable: false),
                    reported_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    investigated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    investigated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incidents", x => x.incident_id);
                });

            migrationBuilder.CreateTable(
                name: "risk_assessments",
                schema: "ehs",
                columns: table => new
                {
                    risk_assessment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    hazard_description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    severity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    likelihood = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    risk_score = table.Column<int>(type: "integer", nullable: false),
                    risk_level = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    assessed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    assessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    review_due_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_assessments", x => x.risk_assessment_id);
                });

            migrationBuilder.CreateTable(
                name: "training_records",
                schema: "ehs",
                columns: table => new
                {
                    training_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    training_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    issued_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    certificate_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_training_records", x => x.training_record_id);
                });

            migrationBuilder.CreateTable(
                name: "incident_corrective_actions",
                schema: "ehs",
                columns: table => new
                {
                    corrective_action_id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id1 = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    assigned_to = table.Column<Guid>(type: "uuid", nullable: false),
                    due_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_corrective_actions", x => new { x.incident_id1, x.corrective_action_id });
                    table.ForeignKey(
                        name: "FK_incident_corrective_actions_incidents_incident_id1",
                        column: x => x.incident_id1,
                        principalSchema: "ehs",
                        principalTable: "incidents",
                        principalColumn: "incident_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "incident_investigations",
                schema: "ehs",
                columns: table => new
                {
                    incident_id1 = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_investigation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    findings = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    root_cause = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    recommendations = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    investigated_by = table.Column<Guid>(type: "uuid", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_investigations", x => x.incident_id1);
                    table.ForeignKey(
                        name: "FK_incident_investigations_incidents_incident_id1",
                        column: x => x.incident_id1,
                        principalSchema: "ehs",
                        principalTable: "incidents",
                        principalColumn: "incident_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "incident_witnesses",
                schema: "ehs",
                columns: table => new
                {
                    incident_witness_id = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id1 = table.Column<Guid>(type: "uuid", nullable: false),
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    statement = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    recorded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_witnesses", x => new { x.incident_id1, x.incident_witness_id });
                    table.ForeignKey(
                        name: "FK_incident_witnesses_incidents_incident_id1",
                        column: x => x.incident_id1,
                        principalSchema: "ehs",
                        principalTable: "incidents",
                        principalColumn: "incident_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "risk_controls",
                schema: "ehs",
                columns: table => new
                {
                    risk_control_id = table.Column<Guid>(type: "uuid", nullable: false),
                    risk_assessment_id1 = table.Column<Guid>(type: "uuid", nullable: false),
                    risk_assessment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    control_measure = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    responsible_person = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    implemented_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    verified_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_controls", x => new { x.risk_assessment_id1, x.risk_control_id });
                    table.ForeignKey(
                        name: "FK_risk_controls_risk_assessments_risk_assessment_id1",
                        column: x => x.risk_assessment_id1,
                        principalSchema: "ehs",
                        principalTable: "risk_assessments",
                        principalColumn: "risk_assessment_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_incident_corrective_actions_incident_id",
                schema: "ehs",
                table: "incident_corrective_actions",
                column: "incident_id1");

            migrationBuilder.CreateIndex(
                name: "ix_incident_investigations_incident_id",
                schema: "ehs",
                table: "incident_investigations",
                column: "incident_id1");

            migrationBuilder.CreateIndex(
                name: "ix_incident_witnesses_incident_id",
                schema: "ehs",
                table: "incident_witnesses",
                column: "incident_id1");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_incident_date",
                schema: "ehs",
                table: "incidents",
                column: "incident_date");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_status",
                schema: "ehs",
                table: "incidents",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_tenant_id",
                schema: "ehs",
                table: "incidents",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_risk_assessments_review_due_date",
                schema: "ehs",
                table: "risk_assessments",
                column: "review_due_date");

            migrationBuilder.CreateIndex(
                name: "ix_risk_assessments_risk_level",
                schema: "ehs",
                table: "risk_assessments",
                column: "risk_level");

            migrationBuilder.CreateIndex(
                name: "ix_risk_assessments_status",
                schema: "ehs",
                table: "risk_assessments",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_risk_assessments_tenant_id",
                schema: "ehs",
                table: "risk_assessments",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_risk_controls_risk_assessment_id",
                schema: "ehs",
                table: "risk_controls",
                column: "risk_assessment_id1");

            migrationBuilder.CreateIndex(
                name: "ix_training_records_employee_id",
                schema: "ehs",
                table: "training_records",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_training_records_expires_at",
                schema: "ehs",
                table: "training_records",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_training_records_tenant_id",
                schema: "ehs",
                table: "training_records",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_training_records_training_type",
                schema: "ehs",
                table: "training_records",
                column: "training_type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "incident_corrective_actions",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "incident_investigations",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "incident_witnesses",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "risk_controls",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "training_records",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "incidents",
                schema: "ehs");

            migrationBuilder.DropTable(
                name: "risk_assessments",
                schema: "ehs");
        }
    }
}
