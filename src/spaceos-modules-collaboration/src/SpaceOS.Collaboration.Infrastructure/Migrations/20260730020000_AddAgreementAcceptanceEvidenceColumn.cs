using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0008 — the <c>AcceptanceEvidence</c> column that F1 forgot.
/// </summary>
/// <remarks>
/// <para>
/// <b>This repairs a defect introduced in B2B-10 F1.</b> The agreement aggregate gained an
/// <c>AcceptanceEvidence</c> property — the thing that proves the guest actually accepted — and
/// EF mapped it by convention, but no migration ever created the column. Any real
/// <c>SaveChanges</c> on an agreement failed with <c>42703: column "AcceptanceEvidence" of
/// relation "collaboration_agreements" does not exist</c>.
/// </para>
/// <para>
/// It survived review because every test the module had at the time ran on the EF InMemory
/// provider, which has no schema to disagree with. The failure surfaced the first time an
/// agreement was written to PostgreSQL — in the F2/4 concurrency suite, which was written to
/// measure something else entirely. That is the argument for the integration project existing at
/// all: a missing column is not a subtle bug, and nothing in the module could see it.
/// </para>
/// <para>
/// Nullable, because it is only populated on acceptance; bounded at 512 to match the property
/// configuration, since it holds a reference to the evidence and not the evidence itself.
/// </para>
/// </remarks>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260730020000_AddAgreementAcceptanceEvidenceColumn")]
public partial class AddAgreementAcceptanceEvidenceColumn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql(
            """
            ALTER TABLE collaboration_agreements
                ADD COLUMN IF NOT EXISTS "AcceptanceEvidence" varchar(512) NULL;
            """);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql(
            """
            ALTER TABLE collaboration_agreements
                DROP COLUMN IF EXISTS "AcceptanceEvidence";
            """);
}
