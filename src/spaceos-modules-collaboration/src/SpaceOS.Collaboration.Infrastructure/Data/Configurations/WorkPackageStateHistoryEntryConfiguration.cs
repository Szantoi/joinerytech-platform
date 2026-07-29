using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data.Configurations;

internal sealed class WorkPackageStateHistoryEntryConfiguration : IEntityTypeConfiguration<WorkPackageStateHistoryEntry>
{
    public void Configure(EntityTypeBuilder<WorkPackageStateHistoryEntry> builder)
    {
        builder.ToTable("collaboration_work_package_history");

        builder.HasKey(h => h.Id);

        // The aggregate assigns the key itself. Left to convention EF treats a non-default Guid
        // key on an untracked entity as an existing row and emits an UPDATE that matches nothing,
        // surfacing as a phantom concurrency conflict when a child is added to a tracked parent.
        builder.Property(h => h.Id)
            .ValueGeneratedNever();

        builder.Property(h => h.WorkPackageId)
            .IsRequired();

        builder.Property(h => h.FromStatus)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(h => h.ToStatus)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(h => h.ActorTenantId)
            .IsRequired();

        builder.Property(h => h.ActorUserId)
            .IsRequired();

        builder.Property(h => h.ActionName)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(h => h.Reason)
            .HasMaxLength(512);

        builder.Property(h => h.TimestampUtc)
            .IsRequired();

        builder.HasIndex(h => h.WorkPackageId);
    }
}
