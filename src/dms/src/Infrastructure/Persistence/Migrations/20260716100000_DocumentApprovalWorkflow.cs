using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// DMS-BE-HOST: Document aggregate persistence with the approval workflow
    /// (portal DOCUMENT_FSM mirror) + version chain + RLS.
    ///
    /// Status set remap (data-preserving intent): the legacy enum was
    /// Active(0)/Archived(1)/Deleted(2); the new set is Draft(0)/UnderReview(1)/
    /// Released(2)/Archived(3)/Deleted(4) with Active → Released. No document
    /// rows ever existed under the legacy values (the aggregate had no
    /// persistence layer and the earlier EnableRLS migration referencing
    /// dms.documents could never have applied), so no data migration is needed —
    /// the table is created fresh here, and the documents RLS statements moved
    /// here from EnableRLS.
    /// </remarks>
    [DbContext(typeof(DMSDbContext))]
    [Migration("20260716100000_DocumentApprovalWorkflow")]
    public partial class DocumentApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "documents",
                schema: "dms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    current_version = table.Column<int>(type: "integer", nullable: false),
                    link_type = table.Column<int>(type: "integer", nullable: false),
                    link_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    link_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    owner = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    review_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    file_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    valid_until = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_documents", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "document_versions",
                schema: "dms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    file_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    change_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    uploaded_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    blob_path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_document_versions", x => x.id);
                    table.ForeignKey(
                        name: "fk_document_versions_documents_document_id",
                        column: x => x.document_id,
                        principalSchema: "dms",
                        principalTable: "documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_documents_tenant_id",
                schema: "dms",
                table: "documents",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_documents_status",
                schema: "dms",
                table: "documents",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_documents_valid_until",
                schema: "dms",
                table: "documents",
                column: "valid_until");

            migrationBuilder.CreateIndex(
                name: "ix_document_versions_document_id_version_number",
                schema: "dms",
                table: "document_versions",
                columns: new[] { "document_id", "version_number" },
                unique: true);

            // RLS — tenant isolation (moved here from EnableRLS: the documents
            // table is created in THIS migration). document_versions has no
            // tenant_id column: isolation flows through the FK to documents.
            migrationBuilder.Sql("ALTER TABLE dms.documents ENABLE ROW LEVEL SECURITY;");

            migrationBuilder.Sql(@"
                CREATE POLICY documents_tenant_isolation ON dms.documents
                USING (tenant_id = current_setting('app.tenant_id')::uuid)
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP POLICY documents_tenant_isolation ON dms.documents;");
            migrationBuilder.Sql("ALTER TABLE dms.documents DISABLE ROW LEVEL SECURITY;");

            migrationBuilder.DropTable(name: "document_versions", schema: "dms");
            migrationBuilder.DropTable(name: "documents", schema: "dms");
        }
    }
}
