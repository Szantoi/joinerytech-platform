using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0009 — the agreement state-history table, which F1 built in the domain but never
/// created in the database.
/// </summary>
/// <remarks>
/// <para>
/// The agreement FSM records every transition with its actor: the audit trail that answers "who
/// agreed to what, and when". It had no table and no EF configuration, so it was mapped by
/// convention to a table nobody had created — and the whole trail would have been lost on the
/// first real write. The work-package history, built in the same epic, had both from the start;
/// this brings the agreement side up to it.
/// </para>
/// <para>
/// RLS follows the parent agreement, exactly like the work-package history policy: the row has no
/// tenant of its own and belongs to whoever participates in the agreement it describes. The
/// predicate reads the session key through
/// <see cref="RlsMigrationSql.CurrentTenantExpression"/> rather than restating it, for the same
/// reason as migration 0006.
/// </para>
/// <para>
/// <c>ON DELETE CASCADE</c> matches the sibling table. It is worth naming the consequence: an
/// agreement's audit trail disappears with the agreement. That is the existing convention in this
/// module, and changing it for one table only would make the two histories behave differently for
/// no stated reason — if the trail should outlive the row, that is a product decision for both.
/// </para>
/// </remarks>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260730030000_AddAgreementHistoryTable")]
public partial class AddAgreementHistoryTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE TABLE IF NOT EXISTS collaboration_agreement_history (
                "Id" uuid NOT NULL,
                "AgreementId" uuid NOT NULL,
                "FromStatus" integer NOT NULL,
                "ToStatus" integer NOT NULL,
                "ActorTenantId" uuid NOT NULL,
                "ActorUserId" uuid NOT NULL,
                "ActionName" varchar(64) NOT NULL,
                "Reason" varchar(512) NULL,
                "TermsRevisionId" uuid NULL,
                "TimestampUtc" timestamptz NOT NULL,
                CONSTRAINT "PK_collaboration_agreement_history" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_agreement_history_agreements" FOREIGN KEY ("AgreementId")
                    REFERENCES collaboration_agreements ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS ix_collaboration_agreement_history_agreement
                ON collaboration_agreement_history ("AgreementId");
            """);

        migrationBuilder.Sql($"""
            ALTER TABLE collaboration_agreement_history ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_agreement_history FORCE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "collaboration_agreement_history_tenant_isolation"
                ON collaboration_agreement_history;

            CREATE POLICY "collaboration_agreement_history_tenant_isolation"
                ON collaboration_agreement_history
                USING (EXISTS (
                    SELECT 1 FROM collaboration_agreements a
                    WHERE a."Id" = collaboration_agreement_history."AgreementId"
                      AND (a."HostTenantId" = {RlsMigrationSql.CurrentTenantExpression}
                           OR a."GuestTenantId" = {RlsMigrationSql.CurrentTenantExpression})))
                WITH CHECK (EXISTS (
                    SELECT 1 FROM collaboration_agreements a
                    WHERE a."Id" = collaboration_agreement_history."AgreementId"
                      AND (a."HostTenantId" = {RlsMigrationSql.CurrentTenantExpression}
                           OR a."GuestTenantId" = {RlsMigrationSql.CurrentTenantExpression})));
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql(
            """
            DROP TABLE IF EXISTS collaboration_agreement_history;
            """);
}
