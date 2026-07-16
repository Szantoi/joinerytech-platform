using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "crm");

            migrationBuilder.CreateTable(
                name: "leads",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    contact_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    contact_phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    contact_company = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AssignedTo = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OpportunityRef = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_leads", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "opportunities",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    LeadId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    contact_phone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    contact_company = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    estimated_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    estimated_value_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Probability = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    ExpectedCloseDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AssignedTo = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    QuoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    LossReason = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CompetitorName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    final_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    final_value_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_opportunities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lead_activities",
                schema: "crm",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    lead_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_activities", x => x.id);
                    table.ForeignKey(
                        name: "FK_lead_activities_leads_lead_id",
                        column: x => x.lead_id,
                        principalSchema: "crm",
                        principalTable: "leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lead_tasks",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    DueDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Priority = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    lead_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lead_tasks_leads_lead_id",
                        column: x => x.lead_id,
                        principalSchema: "crm",
                        principalTable: "leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "opportunity_activities",
                schema: "crm",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_opportunity_activities", x => x.id);
                    table.ForeignKey(
                        name: "FK_opportunity_activities_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "crm",
                        principalTable: "opportunities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "opportunity_tasks",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    DueDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Priority = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    opportunity_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_opportunity_tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_opportunity_tasks_opportunities_opportunity_id",
                        column: x => x.opportunity_id,
                        principalSchema: "crm",
                        principalTable: "opportunities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lead_activities_lead_id",
                schema: "crm",
                table: "lead_activities",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_tasks_lead_id",
                schema: "crm",
                table: "lead_tasks",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_leads_TenantId_AssignedTo",
                schema: "crm",
                table: "leads",
                columns: new[] { "TenantId", "AssignedTo" });

            migrationBuilder.CreateIndex(
                name: "IX_leads_TenantId_Status",
                schema: "crm",
                table: "leads",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_opportunities_TenantId_AssignedTo",
                schema: "crm",
                table: "opportunities",
                columns: new[] { "TenantId", "AssignedTo" });

            migrationBuilder.CreateIndex(
                name: "IX_opportunities_TenantId_LeadId",
                schema: "crm",
                table: "opportunities",
                columns: new[] { "TenantId", "LeadId" });

            migrationBuilder.CreateIndex(
                name: "IX_opportunities_TenantId_Status",
                schema: "crm",
                table: "opportunities",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_opportunity_activities_opportunity_id",
                schema: "crm",
                table: "opportunity_activities",
                column: "opportunity_id");

            migrationBuilder.CreateIndex(
                name: "IX_opportunity_tasks_opportunity_id",
                schema: "crm",
                table: "opportunity_tasks",
                column: "opportunity_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lead_activities",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "lead_tasks",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "opportunity_activities",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "opportunity_tasks",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "leads",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "opportunities",
                schema: "crm");
        }
    }
}
