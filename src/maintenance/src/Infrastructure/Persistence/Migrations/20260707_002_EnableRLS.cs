using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Migrations;

/// <summary>
/// ADR-062: tenant isolation baseline for the maintenance schema. The pre-ADR version
/// of this migration used the divergent <c>app.tenant_id</c> session key with
/// <c>ENABLE</c>-only RLS (inert for the table owner) and fail-open
/// <c>current_setting</c> casts; rewritten in place on the shared
/// <see cref="RlsMigrationSql"/> template (zero-data platform — nothing deployed).
/// <para>
/// Creates the <c>set_tenant_context</c> helper, fail-closed policies with
/// <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c> on the two aggregate-root tables
/// (own <c>tenant_id</c>) and FK-following policies on the two owned-collection
/// tables. Session key: <c>app.current_tenant_id</c> (single key, kernel-interoperable).
/// </para>
/// <remarks>
/// NOTE (MAINT-BE-TRANSITIONS): the [DbContext]/[Migration] attributes are required for
/// EF discovery — hand-written migrations without them never apply.
/// </remarks>
/// </summary>
#nullable disable
[DbContext(typeof(MaintenanceDbContext))]
[Migration("20260707000002_EnableRLS")]
public partial class EnableRLS : Migration
{
    private const string Schema = "maintenance";

    private static readonly (string Table, string TenantColumn)[] RootTables =
    [
        ("assets", "tenant_id"),
        ("work_orders", "tenant_id"),
    ];

    private static readonly (string Child, string Fk, string Parent, string ParentKey)[] ChildTables =
    [
        ("asset_maintenance_plans", "asset_id", "assets", "id"),
        ("work_order_parts", "work_order_id", "work_orders", "id"),
    ];

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));

        foreach (var (table, tenantColumn) in RootTables)
            migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, table, tenantColumn));

        foreach (var (child, fk, parent, parentKey) in ChildTables)
            migrationBuilder.Sql(RlsMigrationSql.EnableChildTenantRls(
                Schema, child, fk, parent, parentKey, "tenant_id"));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        foreach (var (child, _, _, _) in ChildTables)
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, child));

        foreach (var (table, _) in RootTables)
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, table));

        migrationBuilder.Sql(RlsMigrationSql.DropSetTenantContextFunction(Schema));
    }
}
