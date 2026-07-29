using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0004 (B2B-05) — Creates collaboration_outbox and collaboration_inbox tables
/// with RLS policies and deduplication indexes.
/// </summary>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260727220000_AddOutboxAndInboxSchema")]
public partial class AddOutboxAndInboxSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            CREATE TABLE IF NOT EXISTS collaboration_outbox (
                "Id" uuid NOT NULL,
                "MessageId" uuid NOT NULL,
                "SchemaId" varchar(128) NOT NULL,
                "SenderTenantId" uuid NOT NULL,
                "ReceiverTenantId" uuid NOT NULL,
                "EnvelopeJson" jsonb NOT NULL,
                "Status" integer NOT NULL,
                "RetryCount" integer NOT NULL DEFAULT 0,
                "CreatedAtUtc" timestamptz NOT NULL,
                "NextAttemptAtUtc" timestamptz NULL,
                "ProcessedAtUtc" timestamptz NULL,
                "LastError" varchar(512) NULL,
                CONSTRAINT "PK_collaboration_outbox" PRIMARY KEY ("Id")
            );

            CREATE INDEX IF NOT EXISTS "IX_outbox_processing" ON collaboration_outbox ("Status", "NextAttemptAtUtc");

            ALTER TABLE collaboration_outbox ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_outbox FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_outbox_TenantIsolation" ON collaboration_outbox
                USING ("SenderTenantId" = current_setting('app.current_tenant_id', true)::uuid);

            CREATE TABLE IF NOT EXISTS collaboration_inbox (
                "MessageId" uuid NOT NULL,
                "IdempotencyKey" varchar(256) NOT NULL,
                "SchemaId" varchar(128) NOT NULL,
                "SchemaVersion" varchar(32) NOT NULL,
                "SenderTenantId" uuid NOT NULL,
                "ReceiverTenantId" uuid NOT NULL,
                "SequenceNumber" bigint NOT NULL,
                "EnvelopeJson" jsonb NOT NULL,
                "Status" integer NOT NULL,
                "ReceivedAtUtc" timestamptz NOT NULL,
                "ProcessedAtUtc" timestamptz NULL,
                "QuarantineReason" varchar(512) NULL,
                CONSTRAINT "PK_collaboration_inbox" PRIMARY KEY ("MessageId"),
                CONSTRAINT "UQ_inbox_idempotency" UNIQUE ("IdempotencyKey")
            );

            CREATE INDEX IF NOT EXISTS "IX_inbox_receiver" ON collaboration_inbox ("ReceiverTenantId", "Status");

            ALTER TABLE collaboration_inbox ENABLE ROW LEVEL SECURITY;
            ALTER TABLE collaboration_inbox FORCE ROW LEVEL SECURITY;

            CREATE POLICY "collaboration_inbox_TenantIsolation" ON collaboration_inbox
                USING ("ReceiverTenantId" = current_setting('app.current_tenant_id', true)::uuid);
            """,
            suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP POLICY IF EXISTS "collaboration_inbox_TenantIsolation" ON collaboration_inbox;
            DROP TABLE IF EXISTS collaboration_inbox;
            DROP POLICY IF EXISTS "collaboration_outbox_TenantIsolation" ON collaboration_outbox;
            DROP TABLE IF EXISTS collaboration_outbox;
            """,
            suppressTransaction: true);
    }
}
