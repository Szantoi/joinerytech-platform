using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence.Configurations;

/// <summary>
/// Opportunity aggregate mapping: ContactInfo and the two Money value objects are
/// owned (inlined), activities and tasks are owned collections.
/// </summary>
public sealed class OpportunityEntityTypeConfiguration : IEntityTypeConfiguration<Opportunity>
{
    public void Configure(EntityTypeBuilder<Opportunity> builder)
    {
        builder.ToTable("opportunities");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.TenantId).IsRequired();
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(o => o.LeadId);
        builder.Property(o => o.CustomerId).IsRequired();
        builder.Property(o => o.Title).HasMaxLength(256).IsRequired();
        builder.Property(o => o.Probability).HasPrecision(5, 2).IsRequired();
        builder.Property(o => o.ExpectedCloseDate);
        builder.Property(o => o.AssignedTo).IsRequired();
        builder.Property(o => o.CreatedBy).IsRequired();
        builder.Property(o => o.CreatedAt).IsRequired();
        builder.Property(o => o.UpdatedAt);
        builder.Property(o => o.UpdatedBy);
        builder.Property(o => o.OrderId);
        builder.Property(o => o.QuoteId);
        builder.Property(o => o.LossReason).HasMaxLength(512);
        builder.Property(o => o.CompetitorName).HasMaxLength(256);

        builder.HasIndex(o => new { o.TenantId, o.Status });
        builder.HasIndex(o => new { o.TenantId, o.AssignedTo });
        builder.HasIndex(o => new { o.TenantId, o.LeadId });

        builder.OwnsOne(o => o.ContactInfo, contact =>
        {
            contact.Property(c => c.Name).HasColumnName("contact_name").HasMaxLength(256).IsRequired();
            contact.Property(c => c.Email).HasColumnName("contact_email").HasMaxLength(255).IsRequired();
            contact.Property(c => c.Phone).HasColumnName("contact_phone").HasMaxLength(32);
            contact.Property(c => c.Company).HasColumnName("contact_company").HasMaxLength(256);
        });
        builder.Navigation(o => o.ContactInfo).IsRequired();

        builder.OwnsOne(o => o.EstimatedValue, money =>
        {
            money.Property(m => m.Amount).HasColumnName("estimated_value").HasPrecision(18, 2).IsRequired();
            money.Property(m => m.Currency).HasColumnName("estimated_value_currency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(o => o.EstimatedValue).IsRequired();

        // Only set once the deal is won — the whole owned value is optional.
        builder.OwnsOne(o => o.FinalValue, money =>
        {
            money.Property(m => m.Amount).HasColumnName("final_value").HasPrecision(18, 2);
            money.Property(m => m.Currency).HasColumnName("final_value_currency").HasMaxLength(3);
        });

        builder.OwnsMany(o => o.Activities, activity =>
        {
            activity.ToTable("opportunity_activities");
            activity.WithOwner().HasForeignKey("opportunity_id");
            activity.Property<int>("id").ValueGeneratedOnAdd();
            activity.HasKey("id");
            activity.Property(a => a.Type).HasMaxLength(32).IsRequired();
            activity.Property(a => a.Description).IsRequired();
            activity.Property(a => a.CreatedBy).IsRequired();
            activity.Property(a => a.CreatedAt).IsRequired();
        });

        builder.OwnsMany(o => o.Tasks, task =>
        {
            task.ToTable("opportunity_tasks");
            task.WithOwner().HasForeignKey("opportunity_id");
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
