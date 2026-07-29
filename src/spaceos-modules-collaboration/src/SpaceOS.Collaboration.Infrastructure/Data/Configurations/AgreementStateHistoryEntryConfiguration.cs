using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the agreement's state history — the answer to "who agreed to what, and when".
/// </summary>
/// <remarks>
/// Until B2B-10 F2/4 this entity had no configuration and no table: EF mapped it by convention to
/// <c>AgreementStateHistoryEntry</c>, which no migration ever created. Every InMemory test passed
/// while the audit trail had nowhere to land. It mirrors the work-package history table, which
/// did have both from its first migration.
/// </remarks>
public sealed class AgreementStateHistoryEntryConfiguration : IEntityTypeConfiguration<AgreementStateHistoryEntry>
{
    public void Configure(EntityTypeBuilder<AgreementStateHistoryEntry> builder)
    {
        builder.ToTable("collaboration_agreement_history");

        builder.HasKey(e => e.Id);

        // The aggregate assigns the id itself. Without this, EF sees a non-default key on an
        // entity it has not tracked and concludes the row already exists — it then emits an
        // UPDATE that matches nothing, and the whole SaveChanges fails as a phantom concurrency
        // conflict. The audit entry is always new; say so.
        builder.Property(e => e.Id)
            .ValueGeneratedNever();

        builder.Property(e => e.AgreementId)
            .IsRequired();

        builder.Property(e => e.FromStatus)
            .IsRequired();

        builder.Property(e => e.ToStatus)
            .IsRequired();

        builder.Property(e => e.ActorTenantId)
            .IsRequired();

        builder.Property(e => e.ActorUserId)
            .IsRequired();

        builder.Property(e => e.ActionName)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(e => e.Reason)
            .HasMaxLength(512);

        builder.Property(e => e.TimestampUtc)
            .IsRequired();

        builder.HasIndex(e => e.AgreementId);
    }
}
