using SpaceOS.Modules.Hosting.Persistence;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Persistence;

/// <summary>Content contract of the shared RLS migration template (ADR-062).</summary>
public sealed class RlsMigrationSqlTests
{
    [Fact]
    public void Tenant_rls_uses_force_and_the_single_session_key()
    {
        var sql = RlsMigrationSql.EnableTenantRls("qa", "tickets", "tenant_id");

        Assert.Contains("ALTER TABLE qa.\"tickets\" ENABLE ROW LEVEL SECURITY;", sql);
        // ENABLE alone does not bind the table owner — without FORCE the policy is inert.
        Assert.Contains("ALTER TABLE qa.\"tickets\" FORCE ROW LEVEL SECURITY;", sql);
        Assert.Contains("app.current_tenant_id", sql);
        Assert.DoesNotContain("app.tenant_id'", sql);
    }

    [Fact]
    public void Policy_is_fail_closed_on_unset_or_reset_session_key()
    {
        var sql = RlsMigrationSql.EnableTenantRls("hr", "Employees", "TenantId");

        // NULLIF handles both the unset key and the interceptor's '' pool-reset value.
        Assert.Contains("NULLIF(current_setting('app.current_tenant_id', true), '')::uuid", sql);
        Assert.Contains("WITH CHECK", sql);
        Assert.Contains("\"TenantId\"", sql);
    }

    [Fact]
    public void Set_tenant_context_function_writes_the_kernel_session_key()
    {
        var sql = RlsMigrationSql.CreateSetTenantContextFunction("ehs");

        Assert.Contains("CREATE OR REPLACE FUNCTION ehs.set_tenant_context(p_tenant_id uuid)", sql);
        Assert.Contains("set_config('app.current_tenant_id', p_tenant_id::text, false)", sql);
    }

    [Fact]
    public void Child_policy_follows_the_parent_tenant_through_the_foreign_key()
    {
        var sql = RlsMigrationSql.EnableChildTenantRls(
            "maintenance", "work_order_notes", "work_order_id", "work_orders", "id", "tenant_id");

        Assert.Contains("FORCE ROW LEVEL SECURITY", sql);
        Assert.Contains("EXISTS", sql);
        Assert.Contains("maintenance.\"work_orders\"", sql);
        Assert.Contains("parent.\"tenant_id\"", sql);
    }

    [Fact]
    public void Disable_reverses_enable()
    {
        var sql = RlsMigrationSql.DisableTenantRls("crm", "leads");

        Assert.Contains("DROP POLICY IF EXISTS \"leads_tenant_isolation\"", sql);
        Assert.Contains("NO FORCE ROW LEVEL SECURITY", sql);
        Assert.Contains("DISABLE ROW LEVEL SECURITY", sql);
    }
}
