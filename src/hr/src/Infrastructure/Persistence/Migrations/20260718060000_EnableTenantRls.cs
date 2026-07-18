using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ADR-062: tenant isolation baseline for the HR schema (shared template).
    /// Replaces the original hand-written 20260707_002_EnableRLS, which had three defects
    /// (nothing was ever deployed, so the schema round could be rebuilt cleanly):
    /// no [DbContext]/[Migration] attributes (invisible to <c>Database.Migrate()</c> —
    /// the HR schema was never created), the non-kernel session key <c>app.tenant_id</c>,
    /// and policies referencing snake_case columns while the tables use PascalCase.
    /// <para>
    /// Now: <c>set_tenant_context</c> helper + <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c>
    /// + fail-closed policies on employees/absences (own <c>"TenantId"</c>) and an
    /// FK-following policy on employee_skills. Session key: <c>app.current_tenant_id</c>.
    /// </para>
    /// </summary>
    [DbContext(typeof(HRDbContext))]
    [Migration("20260718060000_EnableTenantRls")]
    public partial class EnableTenantRls : Migration
    {
        private const string Schema = "hr";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));

            migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, "employees", "TenantId"));
            migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, "absences", "TenantId"));
            migrationBuilder.Sql(RlsMigrationSql.EnableChildTenantRls(
                Schema, "employee_skills", "EmployeeId", "employees", "Id", "TenantId"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "employee_skills"));
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "absences"));
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "employees"));
            migrationBuilder.Sql(RlsMigrationSql.DropSetTenantContextFunction(Schema));
        }
    }
}
