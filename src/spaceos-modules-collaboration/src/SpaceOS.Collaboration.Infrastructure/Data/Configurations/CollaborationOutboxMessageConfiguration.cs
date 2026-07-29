using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class CollaborationOutboxMessageConfiguration : IEntityTypeConfiguration<CollaborationOutboxMessage>
{
    public void Configure(EntityTypeBuilder<CollaborationOutboxMessage> builder)
    {
        builder.ToTable("collaboration_outbox");

        builder.HasKey(o => o.Id);

        // The aggregate assigns the key itself. Left to convention EF treats a non-default Guid
        // key on an untracked entity as an existing row and emits an UPDATE that matches nothing,
        // surfacing as a phantom concurrency conflict when a child is added to a tracked parent.
        builder.Property(o => o.Id)
            .ValueGeneratedNever();

        builder.Property(o => o.MessageId)
            .IsRequired();

        builder.Property(o => o.SchemaId)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(o => o.SenderTenantId)
            .IsRequired();

        builder.Property(o => o.ReceiverTenantId)
            .IsRequired();

        builder.Property(o => o.EnvelopeJson)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(o => o.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(o => o.RetryCount)
            .IsRequired();

        builder.Property(o => o.CreatedAtUtc)
            .IsRequired();

        builder.Property(o => o.LastError)
            .HasMaxLength(512);

        builder.HasIndex(o => new { o.Status, o.NextAttemptAtUtc });
    }
}
