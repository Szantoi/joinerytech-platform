using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0005 (B2B-10 F1) — Kernel work-scope anchor on delegated work packages.
/// </summary>
/// <remarks>
/// <para>
/// Owned value object, so the three columns live on the package row itself: project and epic are
/// the anchor a host reports against, the task is optional because work is often delegated
/// before it is broken down that far.
/// </para>
/// <para>
/// NULLABLE, including the two "required" ones: packages created before this field existed have
/// no anchor to fill in, and inventing one would put a false reference into an audit trail. The
/// aggregate demands a scope for NEW packages; the column tolerates the history.
/// </para>
/// <para>
/// The index is on the project column alone — every question that uses this anchor ("what has
/// this project delegated") starts there, and the invariant that one agreement stays within one
/// project is checked through it.
/// </para>
/// </remarks>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260729230000_AddWorkPackageWorkScope")]
public partial class AddWorkPackageWorkScope : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            ALTER TABLE collaboration_work_packages
                ADD COLUMN IF NOT EXISTS work_scope_project_id uuid NULL,
                ADD COLUMN IF NOT EXISTS work_scope_epic_id uuid NULL,
                ADD COLUMN IF NOT EXISTS work_scope_task_id uuid NULL;

            CREATE INDEX IF NOT EXISTS ix_collaboration_work_packages_work_scope_project
                ON collaboration_work_packages (work_scope_project_id);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP INDEX IF EXISTS ix_collaboration_work_packages_work_scope_project;

            ALTER TABLE collaboration_work_packages
                DROP COLUMN IF EXISTS work_scope_task_id,
                DROP COLUMN IF EXISTS work_scope_epic_id,
                DROP COLUMN IF EXISTS work_scope_project_id;
            """);
    }
}
