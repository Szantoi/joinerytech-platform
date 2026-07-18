using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.Ehs.Infrastructure.Migrations
{
    /// <summary>
    /// ADR-062: tenant isolation baseline for the EHS schema. Before this migration the
    /// interceptor called a non-existent <c>ehs.set_tenant_context</c> and silently
    /// swallowed the error — every query returned every tenant's rows.
    /// <para>
    /// Creates the <c>set_tenant_context</c> helper, then per-table fail-closed policies
    /// with <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c> on all nine aggregate-root
    /// tables (own <c>tenant_id</c>) and FK-following policies on the four child tables.
    /// Session key: <c>app.current_tenant_id</c> (single key, kernel-interoperable).
    /// </para>
    /// <remarks>
    /// The [DbContext]/[Migration] attributes are mandatory — hand-written migrations
    /// without them are invisible to <c>Database.Migrate()</c> (DMS/maintenance precedent).
    /// </remarks>
    /// </summary>
    [DbContext(typeof(EhsDbContext))]
    [Migration("20260716210000_EnableTenantRls")]
    public partial class EnableTenantRls : Migration
    {
        private const string Schema = "ehs";

        private static readonly (string Table, string TenantColumn)[] RootTables =
        [
            ("incidents", "tenant_id"),
            ("risk_assessments", "tenant_id"),
            ("training_records", "tenant_id"),
            ("locations", "tenant_id"),
            ("hazardous_materials", "tenant_id"),
            ("ppe_items", "tenant_id"),
            ("ppe_issuances", "tenant_id"),
            ("safety_walks", "tenant_id"),
            ("corrective_actions", "tenant_id"),
        ];

        // Child FK columns carry the EF shadow-FK "…_id1" suffix where the owned type also
        // maps its own parent-id property (InitialEhsSchema PK definitions are the source).
        private static readonly (string Child, string Fk, string Parent, string ParentKey)[] ChildTables =
        [
            ("incident_investigations", "incident_id1", "incidents", "incident_id"),
            ("incident_witnesses", "incident_id1", "incidents", "incident_id"),
            ("risk_controls", "risk_assessment_id1", "risk_assessments", "risk_assessment_id"),
            ("safety_walk_findings", "safety_walk_id", "safety_walks", "safety_walk_id"),
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
