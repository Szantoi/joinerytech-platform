using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.QA.src.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ADR-063 rework loop: nullable rework_of_inspection_id column on qa.inspections
    /// (a re-check inspection references the conditionally passed original).
    /// Additive and data-free — risk-free per the ADR impact analysis.
    /// </summary>
    public partial class AddInspectionReworkReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "rework_of_inspection_id",
                schema: "qa",
                table: "inspections",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_inspections_rework_of_inspection_id",
                schema: "qa",
                table: "inspections",
                column: "rework_of_inspection_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_inspections_rework_of_inspection_id",
                schema: "qa",
                table: "inspections");

            migrationBuilder.DropColumn(
                name: "rework_of_inspection_id",
                schema: "qa",
                table: "inspections");
        }
    }
}
