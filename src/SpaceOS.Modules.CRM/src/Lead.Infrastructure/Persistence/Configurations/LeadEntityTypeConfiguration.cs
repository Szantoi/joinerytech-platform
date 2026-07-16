using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence.Configurations;

/// <summary>
/// Lead aggregate mapping: the ContactInfo value object is owned (inlined into the
/// lead row), activities and tasks are owned collections (child tables), and the
/// domain-event list is ignored (it is not persisted state).
/// </summary>
public sealed class LeadEntityTypeConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> builder)
    {
        builder.ToTable("leads");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.TenantId).IsRequired();
        builder.Property(l => l.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(l => l.Source).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(l => l.AssignedTo).IsRequired();
        builder.Property(l => l.CreatedBy).IsRequired();
        builder.Property(l => l.CreatedAt).IsRequired();
        builder.Property(l => l.UpdatedAt);
        builder.Property(l => l.UpdatedBy);
        builder.Property(l => l.OpportunityRef);

        // Tenant-scoped lookups + the status/assignee filters the list endpoint uses.
        builder.HasIndex(l => new { l.TenantId, l.Status });
        builder.HasIndex(l => new { l.TenantId, l.AssignedTo });

        builder.OwnsOne(l => l.ContactInfo, contact =>
        {
            contact.Property(c => c.Name).HasColumnName("contact_name").HasMaxLength(256).IsRequired();
            contact.Property(c => c.Email).HasColumnName("contact_email").HasMaxLength(255).IsRequired();
            contact.Property(c => c.Phone).HasColumnName("contact_phone").HasMaxLength(32);
            contact.Property(c => c.Company).HasColumnName("contact_company").HasMaxLength(256);
        });
        builder.Navigation(l => l.ContactInfo).IsRequired();

        builder.OwnsMany(l => l.Activities, activity =>
        {
            activity.ToTable("lead_activities");
            activity.WithOwner().HasForeignKey("lead_id");
            activity.Property<int>("id").ValueGeneratedOnAdd();
            activity.HasKey("id");
            activity.Property(a => a.Type).HasMaxLength(32).IsRequired();
            activity.Property(a => a.Description).IsRequired();
            activity.Property(a => a.CreatedBy).IsRequired();
            activity.Property(a => a.CreatedAt).IsRequired();
        });

        builder.OwnsMany(l => l.Tasks, task =>
        {
            task.ToTable("lead_tasks");
            task.WithOwner().HasForeignKey("lead_id");
            task.HasKey(t => t.Id);
            task.Property(t => t.Title).HasMaxLength(256).IsRequired();
            task.Property(t => t.DueDate).IsRequired();
            task.Property(t => t.Priority).HasMaxLength(16).IsRequired();
            task.Property(t => t.IsCompleted).IsRequired();
            task.Property(t => t.CreatedBy).IsRequired();
            task.Property(t => t.CreatedAt).IsRequired();
        });

        builder.Ignore("_domainEvents");
    }
}
