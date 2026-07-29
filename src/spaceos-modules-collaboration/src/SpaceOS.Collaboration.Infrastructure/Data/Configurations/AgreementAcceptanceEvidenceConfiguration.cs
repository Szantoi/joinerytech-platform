using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class AgreementAcceptanceEvidenceConfiguration : IEntityTypeConfiguration<AgreementAcceptanceEvidence>
{
    public void Configure(EntityTypeBuilder<AgreementAcceptanceEvidence> builder)
    {
        builder.ToTable("collaboration_acceptance_evidences");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.TermsRevisionId)
            .IsRequired();

        builder.Property(e => e.TenantId)
            .IsRequired();

        builder.Property(e => e.UserId)
            .IsRequired();

        builder.Property(e => e.UserRole)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(e => e.AcceptedAtUtc)
            .IsRequired();

        builder.Property(e => e.TermsHash)
            .HasMaxLength(64)
            .IsFixedLength()
            .IsRequired();

        builder.Property(e => e.IpAddress)
            .HasMaxLength(45)
            .IsRequired();

        builder.Property(e => e.UserAgent)
            .HasMaxLength(256)
            .IsRequired();

        builder.HasIndex(e => new { e.TermsRevisionId, e.TenantId });
    }
}
