using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ADR-062: tenant isolation baseline for the kontrolling schema. Before this
    /// migration NO RLS existed at all, while the old interceptor unconditionally called
    /// the non-existent <c>kontrolling.set_tenant_context</c> — every connection died
    /// with 42883 (the KONTROLLING-BE-HOST finding that triggered ADR-062).
    /// <para>
    /// Creates the <c>set_tenant_context</c> helper, fail-closed policies with
    /// <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c> on the two tenant-owning tables
    /// and an FK-following policy on overhead_rules. Session key:
    /// <c>app.current_tenant_id</c> (single key, kernel-interoperable).
    /// </para>
    /// </summary>
    [DbContext(typeof(KontrollingDbContext))]
    [Migration("20260718070000_EnableTenantRls")]
    public partial class EnableTenantRls : Migration
    {
        private const string Schema = "kontrolling";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));

            migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, "overhead_configs", "tenant_id"));
            migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, "cost_adjustments", "tenant_id"));
            migrationBuilder.Sql(RlsMigrationSql.EnableChildTenantRls(
                Schema, "overhead_rules", "overhead_config_id", "overhead_configs", "overhead_config_id", "tenant_id"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "overhead_rules"));
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "cost_adjustments"));
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "overhead_configs"));
            migrationBuilder.Sql(RlsMigrationSql.DropSetTenantContextFunction(Schema));
        }
    }
}
