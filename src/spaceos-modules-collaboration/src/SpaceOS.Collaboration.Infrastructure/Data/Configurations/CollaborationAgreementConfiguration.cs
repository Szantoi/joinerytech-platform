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

        // The aggregate assigns the key itself. Left to convention EF treats a non-default Guid
        // key on an untracked entity as an existing row and emits an UPDATE that matches nothing,
        // surfacing as a phantom concurrency conflict when a child is added to a tracked parent.
        builder.Property(a => a.Id)
            .ValueGeneratedNever();

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

        // Bounded explicitly rather than left to convention: this holds a reference to what proves
        // the acceptance (a document id, a signature reference), never the artefact itself.
        builder.Property(a => a.AcceptanceEvidence)
            .HasMaxLength(512);

        // Optimistic concurrency (B2B-10 F2/4): EF puts the loaded value in the UPDATE's WHERE
        // clause, so a host cancelling an agreement the guest is concurrently accepting loses the
        // race loudly (DbUpdateConcurrencyException) instead of silently overwriting it.
        builder.Property(a => a.RowVersion)
            .IsConcurrencyToken()
            .IsRequired();

        builder.HasMany(a => a.Grants)
            .WithOne()
            .HasForeignKey(g => g.AgreementId)
            .OnDelete(DeleteBehavior.Cascade);

        // Declared for the same reason as the grants: the aggregate appends to a private list and
        // EF only saves what it knows is a navigation. Without this the FSM would keep recording
        // transitions that never reach the database.
        builder.HasMany(a => a.History)
            .WithOne()
            .HasForeignKey(e => e.AgreementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.HostTenantId);
        builder.HasIndex(a => a.GuestTenantId);
    }
}
