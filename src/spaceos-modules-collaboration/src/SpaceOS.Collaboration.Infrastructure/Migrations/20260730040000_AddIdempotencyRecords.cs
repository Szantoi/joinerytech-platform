using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0010 (B2B-10 F3/3) — the idempotency record table.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why a table and not a cache.</b> The guarantee the client is offered is "your retry will not
/// act twice". An in-process dictionary keeps that promise until the first restart or the second
/// instance, and breaks it silently — the client cannot tell that the guarantee stopped applying,
/// which is worse than never having offered it.
/// </para>
/// <para>
/// <b>Unique on (tenant, key).</b> The index is the arbiter of the race between two simultaneous
/// retries, not a lookup optimisation: the loser of the insert is told the request is already in
/// flight. Tenant is part of the key space so one customer's key can never answer another's.
/// </para>
/// <para>
/// RLS follows the ADR-062 baseline like every other table in this schema. It is not a two-party
/// row — an idempotency key belongs to the tenant that sent it — so the shared single-column
/// helper fits here, unlike the collaboration tables.
/// </para>
/// </remarks>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260730040000_AddIdempotencyRecords")]
public partial class AddIdempotencyRecords : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS collaboration_idempotency_records (
                "Id" uuid NOT NULL,
                "TenantId" uuid NOT NULL,
                "Key" character varying(200) NOT NULL,
                "Fingerprint" character varying(128) NOT NULL,
                "ClaimedAtUtc" timestamp with time zone NOT NULL,
                "CompletedAtUtc" timestamp with time zone NULL,
                "StatusCode" integer NULL,
                "Body" text NULL,
                CONSTRAINT "PK_collaboration_idempotency_records" PRIMARY KEY ("Id")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_collaboration_idempotency_records_TenantId_Key"
                ON collaboration_idempotency_records ("TenantId", "Key");
            """);

        migrationBuilder.Sql(
            RlsMigrationSql.EnableTenantRls("public", "collaboration_idempotency_records", "TenantId"));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP POLICY IF EXISTS "collaboration_idempotency_records_tenant_isolation"
                ON collaboration_idempotency_records;
            DROP TABLE IF EXISTS collaboration_idempotency_records;
            """);
    }
}
