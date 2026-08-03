using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Projects.Infrastructure.Data;
using SpaceOS.Projects.Infrastructure.Data.Configurations;

#nullable disable

namespace SpaceOS.Projects.Infrastructure.Migrations;

/// <summary>
/// Migration 0002 (PROJ-05) — the per-tenant, per-year counter behind <c>PRJ-2026-001</c>
/// (ADR-072 §7.3, decided by Gábor on 2026-08-03).
/// </summary>
/// <remarks>
/// <para>
/// A separate migration from 0001 rather than an edit to it: 0001 was already measured against a
/// real database, and rewriting an applied migration is how deployed schemas quietly diverge from
/// fresh ones.
/// </para>
/// <para>
/// <b>The primary key is the concurrency control.</b> <c>(TenantId, Year)</c> is what the
/// allocator's <c>ON CONFLICT</c> targets, so the increment happens under a single row lock. RLS
/// applies here exactly as on the other two tables — a counter row is tenant data, and a tenant
/// able to read another's counter would learn how many projects it runs.
/// </para>
/// </remarks>
[DbContext(typeof(ProjectsDbContext))]
[Migration("20260803210000_AddProjectCodeCounters")]
public partial class AddProjectCodeCounters : Migration
{
    private const string Schema = ProjectsDbContext.SchemaName;
    private const string Counters = ProjectCodeCounterConfiguration.TableName;

    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql($"""
            CREATE TABLE {Schema}."{Counters}" (
                "TenantId"  uuid    NOT NULL,
                "Year"      integer NOT NULL,
                "LastValue" integer NOT NULL,
                CONSTRAINT "PK_{Counters}" PRIMARY KEY ("TenantId", "Year")
            );
            """);

        migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, Counters, "TenantId"));
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, Counters));
        migrationBuilder.Sql($"""DROP TABLE IF EXISTS {Schema}."{Counters}";""");
    }
}
