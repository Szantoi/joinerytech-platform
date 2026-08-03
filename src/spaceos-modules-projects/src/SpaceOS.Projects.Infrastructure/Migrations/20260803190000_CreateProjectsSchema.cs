using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Projects.Infrastructure.Data;
using SpaceOS.Projects.Infrastructure.Data.Configurations;

#nullable disable

namespace SpaceOS.Projects.Infrastructure.Migrations;

/// <summary>
/// Migration 0001 (PROJ-05) — the <c>projects</c> schema: the project aggregate, its epic
/// membership, and ADR-062 fail-closed RLS on both tables from the first migration.
/// </summary>
/// <remarks>
/// <para>
/// <b>RLS is here rather than in a follow-up.</b> Collaboration installed its policies before
/// anything set the session key they read, and CRM's arrived with the wrong session-key
/// expression; both cost a repair migration. The order that avoids it is: the table, its policy
/// and the interceptor registration land together, and the proof suite runs against a
/// non-superuser role that RLS can actually bite.
/// </para>
/// <para>
/// <b>The policy expression is imported, not retyped</b>
/// (<see cref="RlsMigrationSql.CurrentTenantExpression"/>). A retyped copy is exactly what
/// produced the five divergent per-module interceptors the hosting package replaced. The cost is
/// stated in collaboration's <c>RlsBaselineAlignment</c> and applies here too: if the platform
/// ever changes the expression, a fresh database gets the new text while deployed ones keep the
/// old — a platform-wide event that needs its own migration everywhere regardless.
/// </para>
/// <para>
/// <b>Both tables carry their own tenant column</b>, so both use the single-column helper. The
/// assignment table's tenant is denormalised deliberately: the <c>(TenantId, EpicId)</c> unique
/// index below is what makes "an epic belongs to at most one project" survive concurrency, and an
/// index cannot span a join.
/// </para>
/// </remarks>
[DbContext(typeof(ProjectsDbContext))]
[Migration("20260803190000_CreateProjectsSchema")]
public partial class CreateProjectsSchema : Migration
{
    private const string Schema = ProjectsDbContext.SchemaName;
    private const string Projects = ProjectConfiguration.TableName;
    private const string Assignments = ProjectEpicAssignmentConfiguration.TableName;

    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql($"CREATE SCHEMA IF NOT EXISTS {Schema};");

        migrationBuilder.Sql($"""
            CREATE TABLE {Schema}."{Projects}" (
                "Id"               uuid         NOT NULL,
                "TenantId"         uuid         NOT NULL,
                "Code"             varchar(32)  NOT NULL,
                "Name"             varchar(200) NOT NULL,
                "Status"           integer      NOT NULL,
                "CustomerId"       uuid         NULL,
                "OriginSystem"     varchar(32)  NULL,
                "OriginExternalId" uuid         NULL,
                "CreatedAtUtc"     timestamptz  NOT NULL,
                "RowVersion"       integer      NOT NULL,
                CONSTRAINT "PK_{Projects}" PRIMARY KEY ("Id")
            );
            """);

        // Unique per tenant: two tenants may both run a "PRJ-2026-001", and neither may learn
        // about the other's numbering by colliding with it.
        migrationBuilder.Sql($"""
            CREATE UNIQUE INDEX "IX_projects_TenantId_Code"
                ON {Schema}."{Projects}" ("TenantId", "Code");
            """);

        migrationBuilder.Sql($"""
            CREATE TABLE {Schema}."{Assignments}" (
                "Id"            uuid        NOT NULL,
                "ProjectId"     uuid        NOT NULL,
                "TenantId"      uuid        NOT NULL,
                "EpicId"        uuid        NOT NULL,
                "AssignedAtUtc" timestamptz NOT NULL,
                CONSTRAINT "PK_{Assignments}" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_{Assignments}_{Projects}_ProjectId"
                    FOREIGN KEY ("ProjectId") REFERENCES {Schema}."{Projects}" ("Id") ON DELETE CASCADE
            );
            """);

        // The module's core invariant, enforced where a check-then-act cannot be raced past.
        migrationBuilder.Sql($"""
            CREATE UNIQUE INDEX "IX_project_epic_assignments_TenantId_EpicId"
                ON {Schema}."{Assignments}" ("TenantId", "EpicId");
            """);

        migrationBuilder.Sql($"""
            CREATE INDEX "IX_project_epic_assignments_ProjectId"
                ON {Schema}."{Assignments}" ("ProjectId");
            """);

        migrationBuilder.Sql(RlsMigrationSql.CreateSetTenantContextFunction(Schema));
        migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, Projects, "TenantId"));
        migrationBuilder.Sql(RlsMigrationSql.EnableTenantRls(Schema, Assignments, "TenantId"));
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, Assignments));
        migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, Projects));
        migrationBuilder.Sql(RlsMigrationSql.DropSetTenantContextFunction(Schema));

        migrationBuilder.Sql($"""DROP TABLE IF EXISTS {Schema}."{Assignments}";""");
        migrationBuilder.Sql($"""DROP TABLE IF EXISTS {Schema}."{Projects}";""");
        migrationBuilder.Sql($"DROP SCHEMA IF EXISTS {Schema};");
    }
}
