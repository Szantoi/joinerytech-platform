using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.Ehs.Infrastructure.Migrations
{
    /// <summary>
    /// RISKS-5X5-BE: RiskAssessment 5×5 matrix extension.
    /// - location_id (optional EhsLocation reference) + index
    /// - FSM timestamps (submitted_at / approved_at / archived_at)
    /// - risk_controls.corrective_action_id (unified CAPA link)
    /// - status remap (hand-written, data-preserving): the old lifecycle knew
    ///   Active/Archived; Active maps to Approved in the new
    ///   Draft → UnderReview → Approved → Archived FSM. Reversible Down.
    /// </summary>
    public partial class RiskAssessment5x5Fsm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remap legacy status values to the new FSM (statuses are stored as strings)
            migrationBuilder.Sql(
                "UPDATE ehs.risk_assessments SET status = 'Approved' WHERE status = 'Active';");

            migrationBuilder.AddColumn<Guid>(
                name: "corrective_action_id",
                schema: "ehs",
                table: "risk_controls",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "approved_at",
                schema: "ehs",
                table: "risk_assessments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "archived_at",
                schema: "ehs",
                table: "risk_assessments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "location_id",
                schema: "ehs",
                table: "risk_assessments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "submitted_at",
                schema: "ehs",
                table: "risk_assessments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_risk_assessments_location_id",
                schema: "ehs",
                table: "risk_assessments",
                column: "location_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse the status remap — every non-Archived state collapses back to Active
            migrationBuilder.Sql(
                "UPDATE ehs.risk_assessments SET status = 'Active' WHERE status <> 'Archived';");

            migrationBuilder.DropIndex(
                name: "ix_risk_assessments_location_id",
                schema: "ehs",
                table: "risk_assessments");

            migrationBuilder.DropColumn(
                name: "corrective_action_id",
                schema: "ehs",
                table: "risk_controls");

            migrationBuilder.DropColumn(
                name: "approved_at",
                schema: "ehs",
                table: "risk_assessments");

            migrationBuilder.DropColumn(
                name: "archived_at",
                schema: "ehs",
                table: "risk_assessments");

            migrationBuilder.DropColumn(
                name: "location_id",
                schema: "ehs",
                table: "risk_assessments");

            migrationBuilder.DropColumn(
                name: "submitted_at",
                schema: "ehs",
                table: "risk_assessments");
        }
    }
}
