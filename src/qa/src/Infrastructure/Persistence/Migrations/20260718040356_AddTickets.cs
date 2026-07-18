using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tickets",
                schema: "qa",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticket_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    priority = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    product_id = table.Column<Guid>(type: "uuid", nullable: true),
                    inspection_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    reported_by = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_to = table.Column<Guid>(type: "uuid", nullable: true),
                    resolution_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    reported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tickets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ticket_resolution_actions",
                schema: "qa",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: false),
                    ticket_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    cost_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    cost_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_resolution_actions", x => new { x.ticket_id, x.id });
                    table.ForeignKey(
                        name: "FK_ticket_resolution_actions_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalSchema: "qa",
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_tickets_assigned_to",
                schema: "qa",
                table: "tickets",
                column: "assigned_to");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_reported_at",
                schema: "qa",
                table: "tickets",
                column: "reported_at");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_status",
                schema: "qa",
                table: "tickets",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_tenant_id",
                schema: "qa",
                table: "tickets",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ticket_resolution_actions",
                schema: "qa");

            migrationBuilder.DropTable(
                name: "tickets",
                schema: "qa");
        }
    }
}
