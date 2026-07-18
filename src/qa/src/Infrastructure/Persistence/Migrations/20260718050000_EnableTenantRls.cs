using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ADR-062: tenant isolation baseline for the QA schema. Before this migration the
    /// interceptor called a non-existent <c>qa.set_tenant_context</c> and silently
    /// swallowed the error — every query returned every tenant's rows.
    /// <para>
    /// Creates the <c>set_tenant_context</c> helper, fail-closed policies with
    /// <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c> on the three aggregate-root tables
    /// (own <c>tenant_id</c>) and FK-following policies on the three owned-collection
    /// tables. Session key: <c>app.current_tenant_id</c> (single key, kernel-interoperable).
    /// </para>
    /// <remarks>
    /// The [DbContext]/[Migration] attributes are mandatory — hand-written migrations
    /// without them are invisible to <c>Database.Migrate()</c> (DMS/maintenance precedent).
    /// </remarks>
    /// </summary>
    [DbContext(typeof(QADbContext))]
    [Migration("20260718050000_EnableTenantRls")]
    public partial class EnableTenantRls : Migration
    {
        private const string Schema = "qa";

        private static readonly (string Table, string TenantColumn)[] RootTables =
        [
            ("qa_checkpoints", "tenant_id"),
            ("inspections", "tenant_id"),
            ("tickets", "tenant_id"),
        ];

        private static readonly (string Child, string Fk, string Parent, string ParentKey)[] ChildTables =
        [
            ("inspection_defects", "inspection_id", "inspections", "id"),
            ("qa_checkpoint_criteria", "qa_checkpoint_id", "qa_checkpoints", "id"),
            ("ticket_resolution_actions", "ticket_id", "tickets", "id"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));

            foreach (var (table, tenantColumn) in RootTables)
                migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, table, tenantColumn));

            foreach (var (child, fk, parent, parentKey) in ChildTables)
                migrationBuilder.Sql(RlsMigrationSql.EnableChildTenantRls(
                    Schema, child, fk, parent, parentKey, "tenant_id"));
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
