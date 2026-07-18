using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ADR-062: tenant isolation baseline for the crm schema. Before this migration the
    /// CRM had NO isolation at all — no interceptor, no policies — while the DbContext
    /// comment claimed "RLS in the deployed database".
    /// <para>
    /// Creates the <c>set_tenant_context</c> helper, fail-closed policies with
    /// <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c> on the two aggregate-root tables
    /// (own <c>"TenantId"</c>) and FK-following policies on the four owned collection
    /// tables. Session key: <c>app.current_tenant_id</c> (single key, kernel-interoperable).
    /// </para>
    /// </summary>
    [DbContext(typeof(CrmDbContext))]
    [Migration("20260718080000_EnableTenantRls")]
    public partial class EnableTenantRls : Migration
    {
        private const string Schema = "crm";

        private static readonly (string Table, string TenantColumn)[] RootTables =
        [
            ("leads", "TenantId"),
            ("opportunities", "TenantId"),
        ];

        private static readonly (string Child, string Fk, string Parent, string ParentKey)[] ChildTables =
        [
            ("lead_activities", "lead_id", "leads", "Id"),
            ("lead_tasks", "lead_id", "leads", "Id"),
            ("opportunity_activities", "opportunity_id", "opportunities", "Id"),
            ("opportunity_tasks", "opportunity_id", "opportunities", "Id"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));

            foreach (var (table, tenantColumn) in RootTables)
                migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, table, tenantColumn));

            foreach (var (child, fk, parent, parentKey) in ChildTables)
                migrationBuilder.Sql(RlsMigrationSql.EnableChildTenantRls(
                    Schema, child, fk, parent, parentKey, "TenantId"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (child, _, _, _) in ChildTables)
                migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, child));

            foreach (var (table, _) in RootTables)
                migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, table));

            migrationBuilder.Sql(RlsMigrationSql.DropSetTenantContextFunction(Schema));
        }
    }
}
