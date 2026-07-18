namespace SpaceOS.Modules.Hosting.Persistence;

/// <summary>
/// The shared RLS migration SQL template (ADR-062): one session key
/// (<c>app.current_tenant_id</c>), <c>ENABLE</c> + <c>FORCE ROW LEVEL SECURITY</c> and a
/// fail-closed tenant policy per tenant-scoped table.
/// </summary>
/// <remarks>
/// <para>
/// <b>FORCE RLS is not optional</b>: plain <c>ENABLE</c> does not apply to the table owner,
/// and the deploy role frequently owns the tables it migrates — without <c>FORCE</c> the
/// policies are silently inert (the "CRITICAL" note of
/// <c>MULTI_TENANT_RLS_ARCHITECTURE_2026.md</c>; the kernel applies it in 11 migrations).
/// Note that PostgreSQL superusers always bypass RLS regardless of <c>FORCE</c> — the
/// deploy role must not be a superuser for the policies to bite.
/// </para>
/// <para>
/// The policy expression uses <c>NULLIF(current_setting('app.current_tenant_id', true), '')</c>
/// so both an unset key and the interceptor's pool-reset value (<c>''</c>) yield SQL
/// <c>NULL</c> → the comparison is false → <b>no rows</b> (fail-closed), instead of a cast
/// error or an accidental full read.
/// </para>
/// </remarks>
public static class RlsMigrationSql
{
    /// <summary>The policy predicate reading the session key; NULL (→ no rows) when unset.</summary>
    public const string CurrentTenantExpression =
        "NULLIF(current_setting('app.current_tenant_id', true), '')::uuid";

    /// <summary>
    /// Creates (or replaces) the module-schema <c>set_tenant_context</c> helper function.
    /// The shared interceptor calls <c>set_config</c> directly (kernel parity); this function
    /// exists for manual sessions, SQL tooling and interop with pre-ADR callers.
    /// </summary>
    /// <param name="schema">The module schema (e.g. <c>qa</c>, <c>ehs</c>).</param>
    /// <returns>Idempotent SQL creating the function.</returns>
    public static string CreateSetTenantContextFunction(string schema) =>
        $"""
        CREATE OR REPLACE FUNCTION {schema}.set_tenant_context(p_tenant_id uuid)
        RETURNS void
        LANGUAGE sql
        AS $fn$
            SELECT set_config('app.current_tenant_id', p_tenant_id::text, false);
        $fn$;
        """;

    /// <summary>Drops the <c>set_tenant_context</c> helper (Down migration counterpart).</summary>
    /// <param name="schema">The module schema.</param>
    /// <returns>Idempotent SQL dropping the function.</returns>
    public static string DropSetTenantContextFunction(string schema) =>
        $"DROP FUNCTION IF EXISTS {schema}.set_tenant_context(uuid);";

    /// <summary>
    /// Enables fail-closed tenant isolation on a table that carries its own tenant column:
    /// <c>ENABLE</c> + <c>FORCE</c> RLS and a combined USING/WITH CHECK policy.
    /// </summary>
    /// <param name="schema">The module schema.</param>
    /// <param name="table">The table name (quoted as-is).</param>
    /// <param name="tenantColumn">The tenant id column (e.g. <c>tenant_id</c> or <c>TenantId</c>).</param>
    /// <returns>Idempotent SQL enabling the policy.</returns>
    public static string EnableTenantRls(string schema, string table, string tenantColumn) =>
        $"""
        ALTER TABLE {schema}."{table}" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {schema}."{table}" FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "{table}_tenant_isolation" ON {schema}."{table}";
        CREATE POLICY "{table}_tenant_isolation" ON {schema}."{table}"
            USING ("{tenantColumn}" = {CurrentTenantExpression})
            WITH CHECK ("{tenantColumn}" = {CurrentTenantExpression});
        """;

    /// <summary>
    /// Enables tenant isolation on a child table that has no tenant column of its own:
    /// the policy follows the parent row's tenant through the foreign key.
    /// </summary>
    /// <param name="schema">The module schema (parent and child share it).</param>
    /// <param name="childTable">The child table name.</param>
    /// <param name="childForeignKeyColumn">The child's FK column pointing at the parent.</param>
    /// <param name="parentTable">The parent (tenant-scoped) table name.</param>
    /// <param name="parentKeyColumn">The parent's key column referenced by the FK.</param>
    /// <param name="parentTenantColumn">The parent's tenant id column.</param>
    /// <returns>Idempotent SQL enabling the policy.</returns>
    public static string EnableChildTenantRls(
        string schema,
        string childTable,
        string childForeignKeyColumn,
        string parentTable,
        string parentKeyColumn,
        string parentTenantColumn) =>
        $"""
        ALTER TABLE {schema}."{childTable}" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {schema}."{childTable}" FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "{childTable}_tenant_isolation" ON {schema}."{childTable}";
        CREATE POLICY "{childTable}_tenant_isolation" ON {schema}."{childTable}"
            USING (EXISTS (
                SELECT 1 FROM {schema}."{parentTable}" parent
                WHERE parent."{parentKeyColumn}" = {schema}."{childTable}"."{childForeignKeyColumn}"
                  AND parent."{parentTenantColumn}" = {CurrentTenantExpression}))
            WITH CHECK (EXISTS (
                SELECT 1 FROM {schema}."{parentTable}" parent
                WHERE parent."{parentKeyColumn}" = {schema}."{childTable}"."{childForeignKeyColumn}"
                  AND parent."{parentTenantColumn}" = {CurrentTenantExpression}));
        """;

    /// <summary>Removes tenant isolation from a table (Down migration counterpart).</summary>
    /// <param name="schema">The module schema.</param>
    /// <param name="table">The table name.</param>
    /// <returns>Idempotent SQL dropping the policy and disabling RLS.</returns>
    public static string DisableTenantRls(string schema, string table) =>
        $"""
        DROP POLICY IF EXISTS "{table}_tenant_isolation" ON {schema}."{table}";
        ALTER TABLE {schema}."{table}" NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE {schema}."{table}" DISABLE ROW LEVEL SECURITY;
        """;
}
