using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Records the document owner as an IDENTITY next to the existing display name, so that
    /// object-level access control can be decided at all (Codex P1, business owner decision
    /// 2026-07-29: fail-closed).
    ///
    /// <para>
    /// NULLABLE, deliberately. Documents created before this point have no owner identity to
    /// fill in: <c>owner</c> is a display name, and deriving an account from it would be a
    /// guess written into a security decision. The access rule therefore treats a null owner as
    /// readable-but-not-writable inside the tenant — a documented transition, not the target
    /// state. Backfilling is an operational step (see <c>Document.AssignOwner</c>), not
    /// something this migration can invent.
    /// </para>
    ///
    /// <para>
    /// Hand-written and attribute-annotated, like every other migration in this module: the
    /// module has never carried a model snapshot, so a generated migration diffs against
    /// nothing and re-creates the whole schema (verified — the generator did exactly that).
    /// Adopting snapshots here is worth doing, but it is a separate slice with its own review.
    /// </para>
    /// </remarks>
    [DbContext(typeof(DMSDbContext))]
    [Migration("20260729100000_DocumentOwnerIdentity")]
    public partial class DocumentOwnerIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "owner_user_id",
                schema: "dms",
                table: "documents",
                type: "uuid",
                nullable: true);

            // Every access decision filters on this column, so it is indexed rather than scanned.
            migrationBuilder.CreateIndex(
                name: "ix_documents_owner_user_id",
                schema: "dms",
                table: "documents",
                column: "owner_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_documents_owner_user_id",
                schema: "dms",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "owner_user_id",
                schema: "dms",
                table: "documents");
        }
    }
}
