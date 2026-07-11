using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.CRM.Infrastructure.Migrations;

/// <summary>
/// Initial CRM module schema migration with RLS policies
/// </summary>
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Create schema
        migrationBuilder.EnsureSchema(name: "crm");

        // Create leads table
        migrationBuilder.CreateTable(
            name: "leads",
            schema: "crm",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                contact_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                contact_company = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                contact_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                contact_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                assigned_to = table.Column<Guid>(type: "uuid", nullable: false),
                opportunity_ref = table.Column<Guid>(type: "uuid", nullable: true),
                disqualification_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_leads", x => x.id);
            });

        // Create opportunities table
        migrationBuilder.CreateTable(
            name: "opportunities",
            schema: "crm",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                lead_ref = table.Column<Guid>(type: "uuid", nullable: true),
                quote_ref = table.Column<Guid>(type: "uuid", nullable: true),
                b2b_partner_ref = table.Column<Guid>(type: "uuid", nullable: true),
                contact_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                contact_company = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                contact_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                contact_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                estimated_value_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                estimated_value_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                probability = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                expected_close_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                assigned_to = table.Column<Guid>(type: "uuid", nullable: false),
                loss_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                abandonment_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                tenant_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_opportunities", x => x.id);
            });

        // Create activities table (polymorphic - serves both leads and opportunities)
        migrationBuilder.CreateTable(
            name: "activities",
            schema: "crm",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                activity_id = table.Column<Guid>(type: "uuid", nullable: false),
                type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                logged_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                created_by = table.Column<Guid>(type: "uuid", nullable: false),
                entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                entity_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_activities", x => x.id);
            });

        // Create tasks table (polymorphic - serves both leads and opportunities)
        migrationBuilder.CreateTable(
            name: "tasks",
            schema: "crm",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                task_id = table.Column<Guid>(type: "uuid", nullable: false),
                title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                due_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                completed = table.Column<bool>(type: "boolean", nullable: false),
                completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                created_by = table.Column<Guid>(type: "uuid", nullable: false),
                completed_by = table.Column<Guid>(type: "uuid", nullable: true),
                entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                entity_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_tasks", x => x.id);
            });

        // Create indexes on leads
        migrationBuilder.CreateIndex(
            name: "ix_leads_tenant_id",
            schema: "crm",
            table: "leads",
            column: "tenant_id");

        migrationBuilder.CreateIndex(
            name: "ix_leads_status",
            schema: "crm",
            table: "leads",
            column: "status");

        migrationBuilder.CreateIndex(
            name: "ix_leads_assigned_to",
            schema: "crm",
            table: "leads",
            column: "assigned_to");

        // Create indexes on opportunities
        migrationBuilder.CreateIndex(
            name: "ix_opportunities_tenant_id",
            schema: "crm",
            table: "opportunities",
            column: "tenant_id");

        migrationBuilder.CreateIndex(
            name: "ix_opportunities_status",
            schema: "crm",
            table: "opportunities",
            column: "status");

        migrationBuilder.CreateIndex(
            name: "ix_opportunities_assigned_to",
            schema: "crm",
            table: "opportunities",
            column: "assigned_to");

        migrationBuilder.CreateIndex(
            name: "ix_opportunities_lead_ref",
            schema: "crm",
            table: "opportunities",
            column: "lead_ref");

        // Create indexes on activities
        migrationBuilder.CreateIndex(
            name: "ix_activities_entity_id",
            schema: "crm",
            table: "activities",
            column: "entity_id");

        // Create indexes on tasks
        migrationBuilder.CreateIndex(
            name: "ix_tasks_entity_id",
            schema: "crm",
            table: "tasks",
            column: "entity_id");

        // Enable Row-Level Security
        migrationBuilder.Sql(@"
            ALTER TABLE crm.leads ENABLE ROW LEVEL SECURITY;
            ALTER TABLE crm.opportunities ENABLE ROW LEVEL SECURITY;
            ALTER TABLE crm.activities ENABLE ROW LEVEL SECURITY;
            ALTER TABLE crm.tasks ENABLE ROW LEVEL SECURITY;
        ");

        // Create RLS policies for tenant isolation
        migrationBuilder.Sql(@"
            -- Tenant isolation policy for leads
            CREATE POLICY tenant_isolation_leads ON crm.leads
              USING (tenant_id = current_setting('app.current_tenant')::uuid);

            -- Tenant isolation policy for opportunities
            CREATE POLICY tenant_isolation_opportunities ON crm.opportunities
              USING (tenant_id = current_setting('app.current_tenant')::uuid);

            -- Tenant isolation policy for activities (via parent entity)
            CREATE POLICY tenant_isolation_activities ON crm.activities
              USING (
                entity_id IN (
                  SELECT id FROM crm.leads WHERE tenant_id = current_setting('app.current_tenant')::uuid
                  UNION
                  SELECT id FROM crm.opportunities WHERE tenant_id = current_setting('app.current_tenant')::uuid
                )
              );

            -- Tenant isolation policy for tasks (via parent entity)
            CREATE POLICY tenant_isolation_tasks ON crm.tasks
              USING (
                entity_id IN (
                  SELECT id FROM crm.leads WHERE tenant_id = current_setting('app.current_tenant')::uuid
                  UNION
                  SELECT id FROM crm.opportunities WHERE tenant_id = current_setting('app.current_tenant')::uuid
                )
              );
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop RLS policies
        migrationBuilder.Sql(@"
            DROP POLICY IF EXISTS tenant_isolation_leads ON crm.leads;
            DROP POLICY IF EXISTS tenant_isolation_opportunities ON crm.opportunities;
            DROP POLICY IF EXISTS tenant_isolation_activities ON crm.activities;
            DROP POLICY IF EXISTS tenant_isolation_tasks ON crm.tasks;
        ");

        // Drop tables (cascade will handle indexes)
        migrationBuilder.DropTable(name: "tasks", schema: "crm");
        migrationBuilder.DropTable(name: "activities", schema: "crm");
        migrationBuilder.DropTable(name: "opportunities", schema: "crm");
        migrationBuilder.DropTable(name: "leads", schema: "crm");

        // Drop schema
        migrationBuilder.Sql("DROP SCHEMA IF EXISTS crm CASCADE;");
    }
}
