using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Collaboration.Infrastructure.Data;

#nullable disable

namespace SpaceOS.Collaboration.Infrastructure.Migrations;

/// <summary>
/// Migration 0007 (B2B-10 F2/4) — optimistic concurrency token on the agreement aggregate.
/// </summary>
/// <remarks>
/// <para>
/// The delegated work package has had a concurrency token since its first migration; the
/// agreement — the aggregate whose transitions are actor-guarded and genuinely contended — had
/// none. From <c>Proposed</c> the host may cancel and the guest may accept, and both are legal.
/// Without a token the later write wins silently and the losing party is told its action
/// succeeded, which for an agreement means two participants believing different things about
/// whether they have a contract.
/// </para>
/// <para>
/// <c>DEFAULT 1</c> and <c>NOT NULL</c>: existing rows get a defined starting version rather than
/// a NULL that EF would treat as "no token" and skip the check for. The default stays on the
/// column so that a row inserted by SQL tooling outside EF also starts from a valid version.
/// </para>
/// </remarks>
[DbContext(typeof(CollaborationDbContext))]
[Migration("20260730010000_AddAgreementRowVersion")]
public partial class AddAgreementRowVersion : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql(
            """
            ALTER TABLE collaboration_agreements
                ADD COLUMN IF NOT EXISTS "RowVersion" integer NOT NULL DEFAULT 1;
            """);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql(
            """
            ALTER TABLE collaboration_agreements
                DROP COLUMN IF EXISTS "RowVersion";
            """);
}
