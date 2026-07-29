using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class CollaborationParticipantGrantConfiguration : IEntityTypeConfiguration<CollaborationParticipantGrant>
{
    public void Configure(EntityTypeBuilder<CollaborationParticipantGrant> builder)
    {
        builder.ToTable("collaboration_participant_grants");

        builder.HasKey(g => g.Id);

        builder.Property(g => g.AgreementId)
            .IsRequired();

        builder.Property(g => g.HostTenantId)
            .IsRequired();

        builder.Property(g => g.GuestTenantId)
            .IsRequired();

        builder.Property(g => g.CapabilityScope)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(g => g.TermsRevisionId)
            .IsRequired();

        builder.Property(g => g.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(g => g.GrantedAtUtc)
            .IsRequired();

        builder.Property(g => g.RevocationReason)
            .HasMaxLength(512);

        builder.HasIndex(g => new { g.HostTenantId, g.GuestTenantId, g.Status });
    }
}
