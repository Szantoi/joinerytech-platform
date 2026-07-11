using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnableRLS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create RLS context setter function
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION hr.set_tenant_context(p_tenant_id UUID)
                RETURNS VOID AS $$
                BEGIN
                    PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
                END;
                $$ LANGUAGE plpgsql;
            ");

            // Enable RLS on employees table
            migrationBuilder.Sql(@"
                ALTER TABLE hr.employees ENABLE ROW LEVEL SECURITY;

                -- SELECT policy: employees can only see their own tenant's records
                CREATE POLICY employees_tenant_isolation_select ON hr.employees
                FOR SELECT
                USING (tenant_id = current_setting('app.tenant_id')::uuid);

                -- INSERT policy: can only insert records for current tenant
                CREATE POLICY employees_tenant_isolation_insert ON hr.employees
                FOR INSERT
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

                -- UPDATE policy: can only update records of current tenant
                CREATE POLICY employees_tenant_isolation_update ON hr.employees
                FOR UPDATE
                USING (tenant_id = current_setting('app.tenant_id')::uuid)
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

                -- DELETE policy: can only delete records of current tenant
                CREATE POLICY employees_tenant_isolation_delete ON hr.employees
                FOR DELETE
                USING (tenant_id = current_setting('app.tenant_id')::uuid);
            ");

            // Enable RLS on absences table
            migrationBuilder.Sql(@"
                ALTER TABLE hr.absences ENABLE ROW LEVEL SECURITY;

                -- SELECT policy: can only see absences for current tenant
                CREATE POLICY absences_tenant_isolation_select ON hr.absences
                FOR SELECT
                USING (tenant_id = current_setting('app.tenant_id')::uuid);

                -- INSERT policy: can only insert absences for current tenant
                CREATE POLICY absences_tenant_isolation_insert ON hr.absences
                FOR INSERT
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

                -- UPDATE policy: can only update absences of current tenant
                CREATE POLICY absences_tenant_isolation_update ON hr.absences
                FOR UPDATE
                USING (tenant_id = current_setting('app.tenant_id')::uuid)
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

                -- DELETE policy: can only delete absences of current tenant
                CREATE POLICY absences_tenant_isolation_delete ON hr.absences
                FOR DELETE
                USING (tenant_id = current_setting('app.tenant_id')::uuid);
            ");

            // Enable RLS on employee_skills table (via parent employee FK)
            migrationBuilder.Sql(@"
                ALTER TABLE hr.employee_skills ENABLE ROW LEVEL SECURITY;

                -- SELECT policy: can only see skills for employees of current tenant
                CREATE POLICY employee_skills_tenant_isolation_select ON hr.employee_skills
                FOR SELECT
                USING (
                    employee_id IN (
                        SELECT id FROM hr.employees
                        WHERE tenant_id = current_setting('app.tenant_id')::uuid
                    )
                );

                -- INSERT policy: can only insert skills for employees of current tenant
                CREATE POLICY employee_skills_tenant_isolation_insert ON hr.employee_skills
                FOR INSERT
                WITH CHECK (
                    employee_id IN (
                        SELECT id FROM hr.employees
                        WHERE tenant_id = current_setting('app.tenant_id')::uuid
                    )
                );

                -- UPDATE policy: can only update skills of current tenant's employees
                CREATE POLICY employee_skills_tenant_isolation_update ON hr.employee_skills
                FOR UPDATE
                USING (
                    employee_id IN (
                        SELECT id FROM hr.employees
                        WHERE tenant_id = current_setting('app.tenant_id')::uuid
                    )
                )
                WITH CHECK (
                    employee_id IN (
                        SELECT id FROM hr.employees
                        WHERE tenant_id = current_setting('app.tenant_id')::uuid
                    )
                );

                -- DELETE policy: can only delete skills of current tenant's employees
                CREATE POLICY employee_skills_tenant_isolation_delete ON hr.employee_skills
                FOR DELETE
                USING (
                    employee_id IN (
                        SELECT id FROM hr.employees
                        WHERE tenant_id = current_setting('app.tenant_id')::uuid
                    )
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop RLS policies (policies are dropped when table RLS is disabled)
            migrationBuilder.Sql(@"
                ALTER TABLE hr.employees DISABLE ROW LEVEL SECURITY;
                ALTER TABLE hr.absences DISABLE ROW LEVEL SECURITY;
                ALTER TABLE hr.employee_skills DISABLE ROW LEVEL SECURITY;
            ");

            // Drop function
            migrationBuilder.Sql(@"
                DROP FUNCTION IF EXISTS hr.set_tenant_context(uuid);
            ");
        }
    }
}
