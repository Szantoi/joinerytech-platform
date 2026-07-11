using Microsoft.EntityFrameworkCore.Migrations;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Migrations;

/// <summary>
/// Enables Row-Level Security (RLS) for multi-tenancy in Maintenance module.
/// Creates PostgreSQL function for tenant context management and RLS policies.
/// Reuses DMS Week 3 pattern for consistency.
/// </summary>
#nullable disable
public partial class EnableRLS : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Create PostgreSQL function to set tenant context
        migrationBuilder.Sql(@"
            CREATE OR REPLACE FUNCTION maintenance.set_tenant_context(p_tenant_id UUID)
            RETURNS VOID AS $$
            BEGIN
                PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
            END;
            $$ LANGUAGE plpgsql;
        ");

        // Enable RLS on assets table
        migrationBuilder.Sql("ALTER TABLE maintenance.assets ENABLE ROW LEVEL SECURITY;");

        // Create RLS policies for assets table (SELECT, INSERT, UPDATE, DELETE)
        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_assets_select ON maintenance.assets
            FOR SELECT
            USING (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_assets_insert ON maintenance.assets
            FOR INSERT
            WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_assets_update ON maintenance.assets
            FOR UPDATE
            USING (tenant_id = current_setting('app.tenant_id')::uuid)
            WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_assets_delete ON maintenance.assets
            FOR DELETE
            USING (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        // Enable RLS on work_orders table
        migrationBuilder.Sql("ALTER TABLE maintenance.work_orders ENABLE ROW LEVEL SECURITY;");

        // Create RLS policies for work_orders table
        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_orders_select ON maintenance.work_orders
            FOR SELECT
            USING (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_orders_insert ON maintenance.work_orders
            FOR INSERT
            WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_orders_update ON maintenance.work_orders
            FOR UPDATE
            USING (tenant_id = current_setting('app.tenant_id')::uuid)
            WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_orders_delete ON maintenance.work_orders
            FOR DELETE
            USING (tenant_id = current_setting('app.tenant_id')::uuid);
        ");

        // Enable RLS on asset_maintenance_plans table (via parent FK filtering)
        migrationBuilder.Sql("ALTER TABLE maintenance.asset_maintenance_plans ENABLE ROW LEVEL SECURITY;");

        // Create RLS policies for asset_maintenance_plans table
        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_asset_maintenance_plans_select ON maintenance.asset_maintenance_plans
            FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM maintenance.assets
                WHERE assets.id = asset_maintenance_plans.asset_id
                AND assets.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_asset_maintenance_plans_insert ON maintenance.asset_maintenance_plans
            FOR INSERT
            WITH CHECK (EXISTS (
                SELECT 1 FROM maintenance.assets
                WHERE assets.id = asset_maintenance_plans.asset_id
                AND assets.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_asset_maintenance_plans_update ON maintenance.asset_maintenance_plans
            FOR UPDATE
            USING (EXISTS (
                SELECT 1 FROM maintenance.assets
                WHERE assets.id = asset_maintenance_plans.asset_id
                AND assets.tenant_id = current_setting('app.tenant_id')::uuid
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM maintenance.assets
                WHERE assets.id = asset_maintenance_plans.asset_id
                AND assets.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_asset_maintenance_plans_delete ON maintenance.asset_maintenance_plans
            FOR DELETE
            USING (EXISTS (
                SELECT 1 FROM maintenance.assets
                WHERE assets.id = asset_maintenance_plans.asset_id
                AND assets.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        // Enable RLS on work_order_parts table (via parent FK filtering)
        migrationBuilder.Sql("ALTER TABLE maintenance.work_order_parts ENABLE ROW LEVEL SECURITY;");

        // Create RLS policies for work_order_parts table
        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_order_parts_select ON maintenance.work_order_parts
            FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM maintenance.work_orders
                WHERE work_orders.id = work_order_parts.work_order_id
                AND work_orders.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_order_parts_insert ON maintenance.work_order_parts
            FOR INSERT
            WITH CHECK (EXISTS (
                SELECT 1 FROM maintenance.work_orders
                WHERE work_orders.id = work_order_parts.work_order_id
                AND work_orders.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_order_parts_update ON maintenance.work_order_parts
            FOR UPDATE
            USING (EXISTS (
                SELECT 1 FROM maintenance.work_orders
                WHERE work_orders.id = work_order_parts.work_order_id
                AND work_orders.tenant_id = current_setting('app.tenant_id')::uuid
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM maintenance.work_orders
                WHERE work_orders.id = work_order_parts.work_order_id
                AND work_orders.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");

        migrationBuilder.Sql(@"
            CREATE POLICY tenant_isolation_work_order_parts_delete ON maintenance.work_order_parts
            FOR DELETE
            USING (EXISTS (
                SELECT 1 FROM maintenance.work_orders
                WHERE work_orders.id = work_order_parts.work_order_id
                AND work_orders.tenant_id = current_setting('app.tenant_id')::uuid
            ));
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop RLS policies
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_assets_select ON maintenance.assets;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_assets_insert ON maintenance.assets;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_assets_update ON maintenance.assets;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_assets_delete ON maintenance.assets;");

        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_orders_select ON maintenance.work_orders;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_orders_insert ON maintenance.work_orders;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_orders_update ON maintenance.work_orders;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_orders_delete ON maintenance.work_orders;");

        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_asset_maintenance_plans_select ON maintenance.asset_maintenance_plans;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_asset_maintenance_plans_insert ON maintenance.asset_maintenance_plans;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_asset_maintenance_plans_update ON maintenance.asset_maintenance_plans;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_asset_maintenance_plans_delete ON maintenance.asset_maintenance_plans;");

        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_order_parts_select ON maintenance.work_order_parts;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_order_parts_insert ON maintenance.work_order_parts;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_order_parts_update ON maintenance.work_order_parts;");
        migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_work_order_parts_delete ON maintenance.work_order_parts;");

        // Disable RLS on tables
        migrationBuilder.Sql("ALTER TABLE maintenance.assets DISABLE ROW LEVEL SECURITY;");
        migrationBuilder.Sql("ALTER TABLE maintenance.work_orders DISABLE ROW LEVEL SECURITY;");
        migrationBuilder.Sql("ALTER TABLE maintenance.asset_maintenance_plans DISABLE ROW LEVEL SECURITY;");
        migrationBuilder.Sql("ALTER TABLE maintenance.work_order_parts DISABLE ROW LEVEL SECURITY;");

        // Drop function
        migrationBuilder.Sql("DROP FUNCTION IF EXISTS maintenance.set_tenant_context(UUID);");
    }
}
