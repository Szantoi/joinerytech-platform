using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SpaceOS.Modules.Hosting.Persistence;

#nullable disable

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Storage for document permission grants, which the aggregate has always produced but the
    /// persistence layer discarded (the navigation was <c>Ignore()</c>d as a phase-2 follow-up).
    ///
    /// <para>
    /// That was harmless while nothing read the grants. It stopped being harmless when access
    /// control started deciding on them: a grant would be accepted, reported as saved, and then
    /// vanish on the next load — the colleague locked out, with nothing in the data to explain
    /// why. Combined with the fail-closed rule it meant "only the owner, forever".
    /// </para>
    ///
    /// <para>
    /// RLS follows the module baseline: the child table is isolated through its parent document
    /// (the tenant lives on <c>dms.documents</c>), the same shape the version chain uses.
    /// </para>
    /// </remarks>
    [DbContext(typeof(DMSDbContext))]
    [Migration("20260729110000_DocumentPermissionStorage")]
    public partial class DocumentPermissionStorage : Migration
    {
        private const string Schema = "dms";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "document_permissions",
                schema: Schema,
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    permission_type = table.Column<int>(type: "integer", nullable: false),
                    granted_to_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    granted_to_role_id = table.Column<Guid>(type: "uuid", nullable: true),
                    granted_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    granted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_permissions", x => x.id);
                    table.ForeignKey(
                        name: "FK_document_permissions_documents_document_id",
                        column: x => x.document_id,
                        principalSchema: Schema,
                        principalTable: "documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_document_permissions_document_id_user",
                schema: Schema,
                table: "document_permissions",
                columns: ["document_id", "granted_to_user_id"]);

            migrationBuilder.CreateIndex(
                name: "ix_document_permissions_document_id_role",
                schema: Schema,
                table: "document_permissions",
                columns: ["document_id", "granted_to_role_id"]);

            // Tenant isolation through the parent document, exactly like the version chain:
            // a grant belongs to whoever the document belongs to.
            migrationBuilder.Sql(RlsMigrationSql.EnableChildTenantRls(
                Schema,
                childTable: "document_permissions",
                childForeignKeyColumn: "document_id",
                parentTable: "documents",
                parentKeyColumn: "id",
                parentTenantColumn: "tenant_id"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RlsMigrationSql.DisableTenantRls(Schema, "document_permissions"));

            migrationBuilder.DropTable(
                name: "document_permissions",
                schema: Schema);
        }
    }
}
