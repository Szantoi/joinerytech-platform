using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0001 (B2B-02) — Creates collaboration schema with cross-tenant RLS policies
/// for agreements and participant grants.
/// </summary>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260727190000_CreateCollaborationSchema")]
public partial class CreateCollaborationSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE TABLE IF NOT EXISTS collaboration_agreements (
                "Id" uuid NOT NULL,
                "HostTenantId" uuid NOT NULL,
                "GuestTenantId" uuid NOT NULL,
                "Title" varchar(256) NOT NULL,
                "Status" integer NOT NULL,
                "CurrentTermsRevisionId" uuid NULL,
                "CreatedAtUtc" timestamptz NOT NULL,
                CONSTRAINT "PK_collaboration_agreements" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_collaboration_agreements_NoSelfLink" CHECK ("HostTenantId" <> "GuestTenantId")
            );

            CREATE INDEX IF NOT EXISTS "IX_collaboration_agreements_Host" ON collaboration_agreements ("HostTenantId");
            CREATE INDEX IF NOT EXISTS "IX_collaboration_agreements_Guest" ON collaboration_agreements ("GuestTenantId");

            ALTER TABLE collaboration_agreements ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_agreements FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_agreements_TenantIsolation" ON collaboration_agreements
                USING ("HostTenantId" = current_setting('app.current_tenant_id', true)::uuid
                       OR "GuestTenantId" = current_setting('app.current_tenant_id', true)::uuid);

            CREATE TABLE IF NOT EXISTS collaboration_participant_grants (
                "Id" uuid NOT NULL,
                "AgreementId" uuid NOT NULL,
                "HostTenantId" uuid NOT NULL,
                "GuestTenantId" uuid NOT NULL,
                "CapabilityScope" varchar(128) NOT NULL,
                "TermsRevisionId" uuid NOT NULL,
                "Status" integer NOT NULL,
                "GrantedAtUtc" timestamptz NOT NULL,
                "ExpiresAtUtc" timestamptz NULL,
                "RevokedAtUtc" timestamptz NULL,
                "RevocationReason" varchar(512) NULL,
                CONSTRAINT "PK_collaboration_participant_grants" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_grants_agreements" FOREIGN KEY ("AgreementId") REFERENCES collaboration_agreements ("Id") ON DELETE CASCADE,
                CONSTRAINT "CK_grants_NoSelfLink" CHECK ("HostTenantId" <> "GuestTenantId")
            );

            CREATE INDEX IF NOT EXISTS "IX_collaboration_participant_grants_Lookup" ON collaboration_participant_grants ("HostTenantId", "GuestTenantId", "Status");

            ALTER TABLE collaboration_participant_grants ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_participant_grants FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_participant_grants_TenantIsolation" ON collaboration_participant_grants
                USING (("HostTenantId" = current_setting('app.current_tenant_id', true)::uuid
                       OR "GuestTenantId" = current_setting('app.current_tenant_id', true)::uuid)
                       AND "Status" = 0);
            """,
            suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS "collaboration_participant_grants_TenantIsolation" ON collaboration_participant_grants;
            DROP TABLE IF EXISTS collaboration_participant_grants;
            DROP POLICY IF EXISTS "collaboration_agreements_TenantIsolation" ON collaboration_agreements;
            DROP TABLE IF EXISTS collaboration_agreements;
            """,
            suppressTransaction: true);
    }
}
