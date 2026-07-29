using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0003 (B2B-04) — Creates collaboration_work_packages and collaboration_work_package_history
/// tables with RLS policies and concurrency tokens.
/// </summary>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260727210000_AddWorkPackagesSchema")]
public partial class AddWorkPackagesSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE TABLE IF NOT EXISTS collaboration_work_packages (
                "Id" uuid NOT NULL,
                "AgreementId" uuid NOT NULL,
                "HostTenantId" uuid NOT NULL,
                "GuestTenantId" uuid NOT NULL,
                "Title" varchar(256) NOT NULL,
                "ScopeDescription" text NOT NULL,
                "Status" integer NOT NULL,
                "DueAtUtc" timestamptz NOT NULL,
                "CreatedAtUtc" timestamptz NOT NULL,
                "RowVersion" integer NOT NULL DEFAULT 1,
                "DeliverableRef" varchar(256) NULL,
                "CompletionProofRef" varchar(256) NULL,
                "RejectionOrChangeReason" varchar(512) NULL,
                CONSTRAINT "PK_collaboration_work_packages" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_work_packages_agreements" FOREIGN KEY ("AgreementId") REFERENCES collaboration_agreements ("Id") ON DELETE CASCADE,
                CONSTRAINT "CK_work_packages_NoSelfLink" CHECK ("HostTenantId" <> "GuestTenantId")
            );

            CREATE INDEX IF NOT EXISTS "IX_work_packages_Agreement" ON collaboration_work_packages ("AgreementId");
            CREATE INDEX IF NOT EXISTS "IX_work_packages_Lookup" ON collaboration_work_packages ("HostTenantId", "GuestTenantId", "Status");

            ALTER TABLE collaboration_work_packages ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_work_packages FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_work_packages_TenantIsolation" ON collaboration_work_packages
                USING ("HostTenantId" = current_setting('app.current_tenant_id', true)::uuid
                       OR "GuestTenantId" = current_setting('app.current_tenant_id', true)::uuid);

            CREATE TABLE IF NOT EXISTS collaboration_work_package_history (
                "Id" uuid NOT NULL,
                "WorkPackageId" uuid NOT NULL,
                "FromStatus" integer NOT NULL,
                "ToStatus" integer NOT NULL,
                "ActorTenantId" uuid NOT NULL,
                "ActorUserId" uuid NOT NULL,
                "ActionName" varchar(64) NOT NULL,
                "Reason" varchar(512) NULL,
                "TimestampUtc" timestamptz NOT NULL,
                CONSTRAINT "PK_collaboration_work_package_history" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_history_work_packages" FOREIGN KEY ("WorkPackageId") REFERENCES collaboration_work_packages ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS "IX_history_work_package" ON collaboration_work_package_history ("WorkPackageId");

            ALTER TABLE collaboration_work_package_history ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_work_package_history FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_work_package_history_TenantIsolation" ON collaboration_work_package_history
                USING (EXISTS (
                    SELECT 1 FROM collaboration_work_packages w
                    WHERE w."Id" = collaboration_work_package_history."WorkPackageId"
                      AND (w."HostTenantId" = current_setting('app.current_tenant_id', true)::uuid
                           OR w."GuestTenantId" = current_setting('app.current_tenant_id', true)::uuid)
                ));
            """,
            suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS "collaboration_work_package_history_TenantIsolation" ON collaboration_work_package_history;
            DROP TABLE IF EXISTS collaboration_work_package_history;
            DROP POLICY IF EXISTS "collaboration_work_packages_TenantIsolation" ON collaboration_work_packages;
            DROP TABLE IF EXISTS collaboration_work_packages;
            """,
            suppressTransaction: true);
    }
}
