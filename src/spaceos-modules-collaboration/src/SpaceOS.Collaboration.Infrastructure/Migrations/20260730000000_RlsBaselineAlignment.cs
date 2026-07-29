using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0006 (B2B-10 F2) — brings all eight Collaboration RLS policies onto the ADR-062
/// baseline expression and gives every one of them an explicit <c>WITH CHECK</c>.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this migration exists at all.</b> The original policies read the session key as
/// <c>current_setting('app.current_tenant_id', true)::uuid</c>. The shared
/// <c>SpaceOsTenantSessionInterceptor</c> writes <b>the empty string</b> into that key when a
/// pooled connection is returned (and for startup migrations and anonymous calls), and
/// <c>''::uuid</c> is not SQL NULL on PostgreSQL — it is
/// <c>invalid input syntax for type uuid</c>. Every query against these tables would therefore
/// have thrown once the module was wired to the platform interceptor. The baseline's
/// <see cref="RlsMigrationSql.CurrentTenantExpression"/> wraps the read in <c>NULLIF(..., '')</c>
/// precisely so that "no tenant in scope" means <b>no rows</b> rather than an error.
/// </para>
/// <para>
/// <b>Why the expression is imported instead of retyped.</b> Referencing the constant means this
/// module cannot drift from the platform rule the way five per-module interceptor copies once
/// did. The <i>predicates</i>, though, are written out here: Collaboration rows belong to two
/// tenants (host and guest), so the single-tenant-column helpers
/// (<c>EnableTenantRls</c>/<c>EnableChildTenantRls</c>) do not fit. The shared part is the
/// session-key reading; the two-party shape is this module's own.
/// </para>
/// <para>
/// <b>The cost of importing it, stated plainly.</b> A migration is normally frozen SQL: what a
/// fresh database gets should be what the deployed ones already got. Reading the expression from
/// a constant breaks that in one direction — if the platform ever changes
/// <c>CurrentTenantExpression</c>, this migration would emit the new text on a fresh database
/// while existing databases keep the old policy. The trade is accepted deliberately: the
/// alternative (a retyped copy) is what produced the defect this migration repairs, and a
/// changed baseline expression is a platform-wide event that will need its own migration in
/// every module anyway. The RLS proof suite asserts the deployed <i>behaviour</i>, not this
/// text, so a drift of that kind fails a test rather than passing silently.
/// </para>
/// <para>
/// <b>The grant policy loses its status filter — this is a bug fix, not a relaxation.</b> The
/// old participant-grant policy read <c>USING (... AND "Status" = 0)</c>. A policy with no
/// <c>WITH CHECK</c> applies its <c>USING</c> expression to newly written rows as well, so the
/// row produced by <c>Revoke()</c> (status ≠ Active) failed the implicit check: <b>revoking a
/// grant was impossible</b> against a real database. Revocation is a security operation, so a
/// policy that blocks it fails closed in the wrong direction. Tenant isolation stays in the
/// policy; "only active grants count" is an authorization question and belongs to the query and
/// the application policy, which is where B2B-02's own design rule puts it.
/// </para>
/// <para>
/// Policy names move to the baseline's <c>{table}_tenant_isolation</c> convention so the shared
/// <c>DisableTenantRls</c> helper can find them later; both the old and the new name are dropped
/// first, which keeps the migration idempotent on a database that has already been part-migrated.
/// </para>
/// </remarks>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260730000000_RlsBaselineAlignment")]
public partial class RlsBaselineAlignment : Migration
{
    private const string Tenant = RlsMigrationSql.CurrentTenantExpression;

    /// <summary>The eight tenant-scoped tables and the predicate that decides who may see a row.</summary>
    private static readonly (string Table, string Predicate)[] Policies =
    [
        ("collaboration_agreements",
            $"""("HostTenantId" = {Tenant} OR "GuestTenantId" = {Tenant})"""),

        // Isolation only: the status filter that used to live here made Revoke() impossible.
        ("collaboration_participant_grants",
            $"""("HostTenantId" = {Tenant} OR "GuestTenantId" = {Tenant})"""),

        ("collaboration_work_packages",
            $"""("HostTenantId" = {Tenant} OR "GuestTenantId" = {Tenant})"""),

        ("collaboration_acceptance_evidences",
            $"""("TenantId" = {Tenant})"""),

        ("collaboration_outbox",
            $"""("SenderTenantId" = {Tenant})"""),

        ("collaboration_inbox",
            $"""("ReceiverTenantId" = {Tenant})"""),

        // Children with no tenant column of their own follow the parent row.
        ("collaboration_terms_revisions",
            $"""
            EXISTS (
                SELECT 1 FROM collaboration_agreements a
                WHERE a."Id" = collaboration_terms_revisions."AgreementId"
                  AND (a."HostTenantId" = {Tenant} OR a."GuestTenantId" = {Tenant}))
            """),

        ("collaboration_work_package_history",
            $"""
            EXISTS (
                SELECT 1 FROM collaboration_work_packages w
                WHERE w."Id" = collaboration_work_package_history."WorkPackageId"
                  AND (w."HostTenantId" = {Tenant} OR w."GuestTenantId" = {Tenant}))
            """),
    ];

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        foreach (var (table, predicate) in Policies)
        {
            migrationBuilder.Sql($"""
                ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
                ALTER TABLE {table} FORCE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS "{table}_TenantIsolation" ON {table};
                DROP POLICY IF EXISTS "{table}_tenant_isolation" ON {table};

                CREATE POLICY "{table}_tenant_isolation" ON {table}
                    USING ({predicate})
                    WITH CHECK ({predicate});
                """);
        }
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Down restores the previous expression shape verbatim, including the grant status
        // filter, so that rolling back really returns the database to the 0005 state rather than
        // to a half-fixed one. Rolling back therefore also restores the revoke defect.
        const string legacy = "current_setting('app.current_tenant_id', true)::uuid";

        foreach (var (table, _) in Policies)
        {
            migrationBuilder.Sql($"""DROP POLICY IF EXISTS "{table}_tenant_isolation" ON {table};""");
        }

        migrationBuilder.Sql($"""
            CREATE POLICY "collaboration_agreements_TenantIsolation" ON collaboration_agreements
                USING ("HostTenantId" = {legacy} OR "GuestTenantId" = {legacy});

            CREATE POLICY "collaboration_participant_grants_TenantIsolation" ON collaboration_participant_grants
                USING (("HostTenantId" = {legacy} OR "GuestTenantId" = {legacy}) AND "Status" = 0);

            CREATE POLICY "collaboration_work_packages_TenantIsolation" ON collaboration_work_packages
                USING ("HostTenantId" = {legacy} OR "GuestTenantId" = {legacy});

            CREATE POLICY "collaboration_acceptance_evidences_TenantIsolation" ON collaboration_acceptance_evidences
                USING ("TenantId" = {legacy});

            CREATE POLICY "collaboration_outbox_TenantIsolation" ON collaboration_outbox
                USING ("SenderTenantId" = {legacy});

            CREATE POLICY "collaboration_inbox_TenantIsolation" ON collaboration_inbox
                USING ("ReceiverTenantId" = {legacy});

            CREATE POLICY "collaboration_terms_revisions_TenantIsolation" ON collaboration_terms_revisions
                USING (EXISTS (
                    SELECT 1 FROM collaboration_agreements a
                    WHERE a."Id" = collaboration_terms_revisions."AgreementId"
                      AND (a."HostTenantId" = {legacy} OR a."GuestTenantId" = {legacy})));

            CREATE POLICY "collaboration_work_package_history_TenantIsolation" ON collaboration_work_package_history
                USING (EXISTS (
                    SELECT 1 FROM collaboration_work_packages w
                    WHERE w."Id" = collaboration_work_package_history."WorkPackageId"
                      AND (w."HostTenantId" = {legacy} OR w."GuestTenantId" = {legacy})));
            """);
    }
}
