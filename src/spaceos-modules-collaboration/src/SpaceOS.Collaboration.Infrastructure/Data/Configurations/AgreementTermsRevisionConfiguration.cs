using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class AgreementTermsRevisionConfiguration : IEntityTypeConfiguration<AgreementTermsRevision>
{
    public void Configure(EntityTypeBuilder<AgreementTermsRevision> builder)
    {
        builder.ToTable("collaboration_terms_revisions");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.AgreementId)
            .IsRequired();

        builder.Property(r => r.RevisionNumber)
            .IsRequired();

        builder.Property(r => r.ContentJson)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(r => r.CanonicalHash)
            .HasMaxLength(64)
            .IsFixedLength()
            .IsRequired();

        builder.Property(r => r.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(r => r.CreatedAtUtc)
            .IsRequired();

        builder.Property(r => r.DocumentRef)
            .HasMaxLength(256);

        builder.HasMany(r => r.Evidences)
            .WithOne()
            .HasForeignKey(e => e.TermsRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.AgreementId, r.RevisionNumber }).IsUnique();
        builder.HasIndex(r => r.CanonicalHash);
    }
}
