using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class CollaborationAgreementConfiguration : IEntityTypeConfiguration<CollaborationAgreement>
{
    public void Configure(EntityTypeBuilder<CollaborationAgreement> builder)
    {
        builder.ToTable("collaboration_agreements");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.HostTenantId)
            .IsRequired();

        builder.Property(a => a.GuestTenantId)
            .IsRequired();

        builder.Property(a => a.Title)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(a => a.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(a => a.CreatedAtUtc)
            .IsRequired();

        builder.HasMany(a => a.Grants)
            .WithOne()
            .HasForeignKey(g => g.AgreementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.HostTenantId);
        builder.HasIndex(a => a.GuestTenantId);
    }
}
