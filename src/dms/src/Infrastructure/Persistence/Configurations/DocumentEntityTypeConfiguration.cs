using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Configurations;

/// <summary>
/// Document aggregate mapping (DMS-BE-HOST): dms.documents + owned version
/// chain in dms.document_versions. Enums are stored as smallint (EF default);
/// the wire string form is a serialization concern (AddDmsApiJsonOptions).
///
/// NOT persisted yet (Phase-2 linking model — the aggregate keeps the
/// behavior, the storage is a follow-up): EntityLinks, Permissions, Tags.
/// </summary>
public class DocumentEntityTypeConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> builder)
    {
        builder.ToTable("documents", "dms");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id)
            .HasConversion(id => id.Value, value => new DocumentId(value))
            .HasColumnName("id")
            .IsRequired();

        // TenantId for RLS (multi-tenancy)
        builder.Property(d => d.TenantId)
            .HasConversion(t => t.Value, value => new TenantId(value))
            .HasColumnName("tenant_id")
            .IsRequired();
        builder.HasIndex(d => d.TenantId).HasDatabaseName("ix_documents_tenant_id");

        builder.Property(d => d.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
        builder.Property(d => d.Type).HasColumnName("type").IsRequired();
        builder.Property(d => d.Status).HasColumnName("status").IsRequired();
        builder.Property(d => d.CurrentVersion).HasColumnName("current_version").IsRequired();

        builder.Property(d => d.LinkType).HasColumnName("link_type").IsRequired();
        builder.Property(d => d.LinkId).HasColumnName("link_id").HasMaxLength(100);
        builder.Property(d => d.LinkLabel).HasColumnName("link_label").HasMaxLength(255).IsRequired();

        builder.Property(d => d.Owner).HasColumnName("owner").HasMaxLength(200).IsRequired();
        builder.Property(d => d.Note).HasColumnName("note").HasMaxLength(2000);
        builder.Property(d => d.ReviewNote).HasColumnName("review_note").HasMaxLength(2000);
        builder.Property(d => d.FileLabel).HasColumnName("file_label").HasMaxLength(255).IsRequired();
        builder.Property(d => d.ValidUntil).HasColumnName("valid_until");

        builder.Property(d => d.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(d => d.UpdatedAt).HasColumnName("updated_at").IsRequired();

        // List/filter support (status chips + expiry window)
        builder.HasIndex(d => d.Status).HasDatabaseName("ix_documents_status");
        builder.HasIndex(d => d.ValidUntil).HasDatabaseName("ix_documents_valid_until");

        // Version chain — owned collection, separate table, ordered access in code
        builder.OwnsMany(d => d.Versions, version =>
        {
            version.ToTable("document_versions", "dms");
            version.WithOwner().HasForeignKey("document_id");

            version.HasKey(v => v.Id);
            // The aggregate generates the key (ctor) — without ValueGeneratedNever
            // EF's set-key heuristic would mark NEW chain entries Modified
            // instead of Added (phantom UPDATE → DbUpdateConcurrencyException)
            version.Property(v => v.Id).HasColumnName("id").ValueGeneratedNever();
            version.Property(v => v.VersionNumber).HasColumnName("version_number").IsRequired();
            version.Property(v => v.FileLabel).HasColumnName("file_label").HasMaxLength(255).IsRequired();
            version.Property(v => v.ChangeNote).HasColumnName("change_note").HasMaxLength(2000).IsRequired();
            version.Property(v => v.Status).HasColumnName("status").IsRequired();
            version.Property(v => v.UploadedBy).HasColumnName("uploaded_by").HasMaxLength(200).IsRequired();
            version.Property(v => v.UploadedAt).HasColumnName("uploaded_at").IsRequired();
            version.Property(v => v.BlobPath).HasColumnName("blob_path").HasMaxLength(500);

            version.HasIndex("document_id", nameof(DocumentVersionEntry.VersionNumber))
                .IsUnique()
                .HasDatabaseName("ix_document_versions_document_id_version_number");
        });
        builder.Navigation(d => d.Versions)
            .UsePropertyAccessMode(PropertyAccessMode.Field)
            .AutoInclude();

        // Phase-2 linking model — behavior kept on the aggregate, storage follow-up
        builder.Ignore(d => d.EntityLinks);
        builder.Ignore(d => d.Permissions);
        builder.Ignore(d => d.Tags);
    }
}
