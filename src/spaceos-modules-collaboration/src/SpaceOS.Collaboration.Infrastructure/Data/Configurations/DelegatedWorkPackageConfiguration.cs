using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class DelegatedWorkPackageConfiguration : IEntityTypeConfiguration<DelegatedWorkPackage>
{
    public void Configure(EntityTypeBuilder<DelegatedWorkPackage> builder)
    {
        builder.ToTable("collaboration_work_packages");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.AgreementId)
            .IsRequired();

        builder.Property(w => w.HostTenantId)
            .IsRequired();

        builder.Property(w => w.GuestTenantId)
            .IsRequired();

        builder.Property(w => w.Title)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(w => w.ScopeDescription)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(w => w.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(w => w.DueAtUtc)
            .IsRequired();

        builder.Property(w => w.CreatedAtUtc)
            .IsRequired();

        builder.Property(w => w.RowVersion)
            .IsConcurrencyToken()
            .IsRequired();

        builder.Property(w => w.DeliverableRef)
            .HasMaxLength(256);

        builder.Property(w => w.CompletionProofRef)
            .HasMaxLength(256);

        builder.Property(w => w.RejectionOrChangeReason)
            .HasMaxLength(512);

        builder.HasMany(w => w.History)
            .WithOne()
            .HasForeignKey(h => h.WorkPackageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => w.AgreementId);
        builder.HasIndex(w => new { w.HostTenantId, w.GuestTenantId, w.Status });
    }
}
