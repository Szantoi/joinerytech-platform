using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class CollaborationInboxMessageConfiguration : IEntityTypeConfiguration<CollaborationInboxMessage>
{
    public void Configure(EntityTypeBuilder<CollaborationInboxMessage> builder)
    {
        builder.ToTable("collaboration_inbox");

        builder.HasKey(i => i.MessageId);

        builder.Property(i => i.IdempotencyKey)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(i => i.SchemaId)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(i => i.SchemaVersion)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(i => i.SenderTenantId)
            .IsRequired();

        builder.Property(i => i.ReceiverTenantId)
            .IsRequired();

        builder.Property(i => i.SequenceNumber)
            .IsRequired();

        builder.Property(i => i.EnvelopeJson)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(i => i.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(i => i.ReceivedAtUtc)
            .IsRequired();

        builder.Property(i => i.QuarantineReason)
            .HasMaxLength(512);

        builder.HasIndex(i => i.IdempotencyKey).IsUnique();
        builder.HasIndex(i => new { i.ReceiverTenantId, i.Status });
    }
}
