using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0002 (B2B-03) — Creates collaboration_terms_revisions and collaboration_acceptance_evidences
/// tables with RLS and immutable audit constraints.
/// </summary>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260727200000_AddTermsRevisionsAndEvidences")]
public partial class AddTermsRevisionsAndEvidences : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE TABLE IF NOT EXISTS collaboration_terms_revisions (
                "Id" uuid NOT NULL,
                "AgreementId" uuid NOT NULL,
                "RevisionNumber" integer NOT NULL,
                "ContentJson" jsonb NOT NULL,
                "CanonicalHash" char(64) NOT NULL,
                "Status" integer NOT NULL,
                "CreatedAtUtc" timestamptz NOT NULL,
                "CreatedByTenantId" uuid NOT NULL,
                "CreatedByUserId" uuid NOT NULL,
                "DocumentRef" varchar(256) NULL,
                CONSTRAINT "PK_collaboration_terms_revisions" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_terms_agreements" FOREIGN KEY ("AgreementId") REFERENCES collaboration_agreements ("Id") ON DELETE CASCADE,
                CONSTRAINT "UQ_terms_revision" UNIQUE ("AgreementId", "RevisionNumber")
            );

            CREATE INDEX IF NOT EXISTS "IX_terms_hash" ON collaboration_terms_revisions ("CanonicalHash");

            ALTER TABLE collaboration_terms_revisions ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_terms_revisions FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_terms_revisions_TenantIsolation" ON collaboration_terms_revisions
                USING (EXISTS (
                    SELECT 1 FROM collaboration_agreements a
                    WHERE a."Id" = collaboration_terms_revisions."AgreementId"
                      AND (a."HostTenantId" = current_setting('app.current_tenant_id', true)::uuid
                           OR a."GuestTenantId" = current_setting('app.current_tenant_id', true)::uuid)
                ));

            CREATE TABLE IF NOT EXISTS collaboration_acceptance_evidences (
                "Id" uuid NOT NULL,
                "TermsRevisionId" uuid NOT NULL,
                "TenantId" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "UserRole" varchar(64) NOT NULL,
                "AcceptedAtUtc" timestamptz NOT NULL,
                "TermsHash" char(64) NOT NULL,
                "IpAddress" varchar(45) NOT NULL,
                "UserAgent" varchar(256) NOT NULL,
                CONSTRAINT "PK_collaboration_acceptance_evidences" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_evidences_revisions" FOREIGN KEY ("TermsRevisionId") REFERENCES collaboration_terms_revisions ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS "IX_evidences_lookup" ON collaboration_acceptance_evidences ("TermsRevisionId", "TenantId");

            ALTER TABLE collaboration_acceptance_evidences ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_acceptance_evidences FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_acceptance_evidences_TenantIsolation" ON collaboration_acceptance_evidences
                USING ("TenantId" = current_setting('app.current_tenant_id', true)::uuid);
            """,
            suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS "collaboration_acceptance_evidences_TenantIsolation" ON collaboration_acceptance_evidences;
            DROP TABLE IF EXISTS collaboration_acceptance_evidences;
            DROP POLICY IF EXISTS "collaboration_terms_revisions_TenantIsolation" ON collaboration_terms_revisions;
            DROP TABLE IF EXISTS collaboration_terms_revisions;
            """,
            suppressTransaction: true);
    }
}
