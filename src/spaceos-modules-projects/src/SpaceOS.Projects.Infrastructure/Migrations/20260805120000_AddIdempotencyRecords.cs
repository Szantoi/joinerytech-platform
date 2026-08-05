using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Projects.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Projects.Infrastructure.Migrations;

/// <summary>
/// Migration 0003 (PROJ-06) — durable idempotency records for the keyed create.
/// </summary>
/// <remarks>
/// <para>
/// The <c>(TenantId, Key)</c> unique index is the mechanism, not an optimisation: two concurrent
/// retries race for it, and the loser is answered instead of acting a second time.
/// </para>
/// <para>
/// RLS applies exactly as on the other tables — a recorded response body is tenant data. The
/// deny-by-default catalog gate (<c>Every_table_in_the_schema_has_RLS_enabled_AND_forced</c>)
/// covers this table with no list to update; that is the gate doing its job.
/// </para>
/// </remarks>
[DbContext(typeof(ProjectsDbContext))]
[Migration("20260805120000_AddIdempotencyRecords")]
public partial class AddIdempotencyRecords : Migration
{
    private const string Schema = ProjectsDbContext.SchemaName;
    private const string Records = ProjectIdempotencyRecordConfiguration.TableName;

    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql($"""
            CREATE TABLE {Schema}."{Records}" (
                "Id"             uuid                     NOT NULL,
                "TenantId"       uuid                     NOT NULL,
                "Key"            character varying(200)   NOT NULL,
                "Fingerprint"    character varying(128)   NOT NULL,
                "ClaimedAtUtc"   timestamp with time zone NOT NULL,
                "CompletedAtUtc" timestamp with time zone NULL,
                "StatusCode"     integer                  NULL,
                "Body"           text                     NULL,
                CONSTRAINT "PK_{Records}" PRIMARY KEY ("Id")
            );

            CREATE UNIQUE INDEX "IX_{Records}_TenantId_Key"
                ON {Schema}."{Records}" ("TenantId", "Key");
            """);

        migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, Records, "TenantId"));
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, Records));
        migrationBuilder.Sql($"""DROP TABLE IF EXISTS {Schema}."{Records}";""");
    }
}
