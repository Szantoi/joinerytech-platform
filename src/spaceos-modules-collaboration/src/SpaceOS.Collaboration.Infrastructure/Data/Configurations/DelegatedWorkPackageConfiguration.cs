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

        // The aggregate assigns the key itself. Left to convention EF treats a non-default Guid
        // key on an untracked entity as an existing row and emits an UPDATE that matches nothing,
        // surfacing as a phantom concurrency conflict when a child is added to a tracked parent.
        builder.Property(w => w.Id)
            .ValueGeneratedNever();

        builder.Property(w => w.AgreementId)
            .IsRequired();

        builder.Property(w => w.HostTenantId)
            .IsRequired();

        builder.Property(w => w.GuestTenantId)
            .IsRequired();

        builder.Property(w => w.Title)
            .HasMaxLength(256)
            .IsRequired();

        // The work-scope anchor is a VALUE object, not an entity: owned, columns inline on the
        // package row. Without this EF tries to treat it as an entity and cannot even build the
        // model (it has no key and no bindable constructor).
        builder.OwnsOne(w => w.WorkScope, scope =>
        {
            scope.Property(s => s.ProjectId).HasColumnName("work_scope_project_id");
            scope.Property(s => s.EpicId).HasColumnName("work_scope_epic_id");
            scope.Property(s => s.TaskId).HasColumnName("work_scope_task_id");
        });

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
