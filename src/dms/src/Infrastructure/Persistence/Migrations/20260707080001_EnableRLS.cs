using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnableRLS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create tenant context setter function
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION dms.set_tenant_context(p_tenant_id uuid)
                RETURNS void AS $$
                BEGIN
                    PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
                END;
                $$ LANGUAGE plpgsql;
            ");

            // Enable RLS on documents table
            migrationBuilder.Sql("ALTER TABLE dms.documents ENABLE ROW LEVEL SECURITY;");

            migrationBuilder.Sql(@"
                CREATE POLICY documents_tenant_isolation ON dms.documents
                USING (tenant_id = current_setting('app.tenant_id')::uuid)
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
            ");

            // Enable RLS on document_categories table
            migrationBuilder.Sql("ALTER TABLE dms.document_categories ENABLE ROW LEVEL SECURITY;");

            migrationBuilder.Sql(@"
                CREATE POLICY document_categories_tenant_isolation ON dms.document_categories
                USING (tenant_id = current_setting('app.tenant_id')::uuid)
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
            ");

            // Enable RLS on tags table
            migrationBuilder.Sql("ALTER TABLE dms.tags ENABLE ROW LEVEL SECURITY;");

            migrationBuilder.Sql(@"
                CREATE POLICY tags_tenant_isolation ON dms.tags
                USING (tenant_id = current_setting('app.tenant_id')::uuid)
                WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop policies and disable RLS
            migrationBuilder.Sql("DROP POLICY documents_tenant_isolation ON dms.documents;");
            migrationBuilder.Sql("ALTER TABLE dms.documents DISABLE ROW LEVEL SECURITY;");

            migrationBuilder.Sql("DROP POLICY document_categories_tenant_isolation ON dms.document_categories;");
            migrationBuilder.Sql("ALTER TABLE dms.document_categories DISABLE ROW LEVEL SECURITY;");

            migrationBuilder.Sql("DROP POLICY tags_tenant_isolation ON dms.tags;");
            migrationBuilder.Sql("ALTER TABLE dms.tags DISABLE ROW LEVEL SECURITY;");

            // Drop the context setter function
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS dms.set_tenant_context(uuid);");
        }
    }
}
