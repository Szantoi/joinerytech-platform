using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// DMS-BE-HOST fixes (Maintenance-module precedent):
    ///  - [DbContext]/[Migration] attributes added — hand-written migrations
    ///    without them are invisible to Database.Migrate().
    ///  - The dms.documents RLS statements moved to the
    ///    DocumentApprovalWorkflow migration: the documents table did not exist
    ///    at this point (InitialCreate only created categories/tags), so this
    ///    migration could never have applied successfully.
    ///
    /// ADR-062 rewrite (zero-data platform, nothing deployed): the RLS SQL now
    /// comes from the shared <see cref="RlsMigrationSql"/> template — single
    /// session key <c>app.current_tenant_id</c> (the module-local
    /// <c>app.tenant_id</c> key is retired), <c>ENABLE</c> +
    /// <c>FORCE ROW LEVEL SECURITY</c> and fail-closed
    /// <c>NULLIF(current_setting(...), '')</c> policies.
    /// </remarks>
    [DbContext(typeof(DMSDbContext))]
    [Migration("20260707080001_EnableRLS")]
    public partial class EnableRLS : Migration
    {
        private const string Schema = "dms";

        private static readonly (string Table, string TenantColumn)[] RootTables =
        [
            ("document_categories", "tenant_id"),
            ("tags", "tenant_id"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));

            foreach (var (table, tenantColumn) in RootTables)
                migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, table, tenantColumn));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (table, _) in RootTables)
                migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, table));

            migrationBuilder.Sql(RlsMigrationSql.DropSetTenantContextFunction(Schema));
        }
    }
}
