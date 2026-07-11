using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Entities;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Infrastructure.Configurations;

/// <summary>
/// EF Core entity configuration for Opportunity aggregate
/// </summary>
public class OpportunityConfiguration : IEntityTypeConfiguration<Opportunity>
{
    public void Configure(EntityTypeBuilder<Opportunity> builder)
    {
        builder.ToTable("opportunities");

        // Primary key
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id)
            .HasColumnName("id")
            .IsRequired();

        // FSM State
        builder.Property(o => o.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // References
        builder.Property(o => o.LeadRef)
            .HasColumnName("lead_ref");

        builder.Property(o => o.QuoteRef)
            .HasColumnName("quote_ref");

        builder.Property(o => o.B2BPartnerRef)
            .HasColumnName("b2b_partner_ref");

        // ContactInfo value object (owned type)
        builder.OwnsOne(o => o.ContactInfo, contact =>
        {
            contact.Property(c => c.Name)
                .HasColumnName("contact_name")
                .HasMaxLength(200)
                .IsRequired();

            contact.Property(c => c.Company)
                .HasColumnName("contact_company")
                .HasMaxLength(200);

            // Email value object (using value converter to avoid nested owned type issues)
            contact.Property(c => c.Email)
                .HasColumnName("contact_email")
                .HasMaxLength(256)
                .HasConversion(
                    e => e.Value,
                    v => new Email(v))
                .IsRequired();

            // PhoneNumber value object (nullable, using value converter)
            contact.Property(c => c.Phone)
                .HasColumnName("contact_phone")
                .HasMaxLength(20)
                .HasConversion(
                    p => p != null ? p.Value : null,
                    v => v != null ? new PhoneNumber(v) : null);
        });

        // EstimatedValue value object (Money)
        builder.OwnsOne(o => o.EstimatedValue, money =>
        {
            money.Property(m => m.Amount)
                .HasColumnName("estimated_value_amount")
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            money.Property(m => m.Currency)
                .HasColumnName("estimated_value_currency")
                .HasConversion<string>()
                .HasMaxLength(3)
                .IsRequired();
        });

        // Opportunity-specific fields
        builder.Property(o => o.Probability)
            .HasColumnName("probability")
            .HasColumnType("decimal(5,2)")
            .IsRequired();

        builder.Property(o => o.ExpectedCloseDate)
            .HasColumnName("expected_close_date");

        builder.Property(o => o.AssignedTo)
            .HasColumnName("assigned_to")
            .IsRequired();

        builder.Property(o => o.LossReason)
            .HasColumnName("loss_reason")
            .HasMaxLength(500);

        builder.Property(o => o.AbandonmentReason)
            .HasColumnName("abandonment_reason")
            .HasMaxLength(500);

        // Metadata fields
        builder.Property(o => o.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(o => o.UpdatedAt)
            .HasColumnName("updated_at");

        builder.Property(o => o.ClosedAt)
            .HasColumnName("closed_at");

        builder.Property(o => o.TenantId)
            .HasColumnName("tenant_id")
            .IsRequired();

        // Activities (owned collection)
        builder.OwnsMany(o => o.Activities, activity =>
        {
            activity.ToTable("activities");

            activity.Property<Guid>("Id")
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            activity.HasKey("Id");

            activity.Property(a => a.ActivityId)
                .HasColumnName("activity_id")
                .IsRequired();

            activity.Property(a => a.Type)
                .HasColumnName("type")
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            activity.Property(a => a.Description)
                .HasColumnName("description")
                .HasMaxLength(2000)
                .IsRequired();

            activity.Property(a => a.LoggedAt)
                .HasColumnName("logged_at")
                .IsRequired();

            activity.Property(a => a.CreatedBy)
                .HasColumnName("created_by")
                .IsRequired();

            // Foreign key to Opportunity
            activity.Property<Guid>("OpportunityId")
                .HasColumnName("entity_id")
                .IsRequired();

            activity.Property<string>("EntityType")
                .HasColumnName("entity_type")
                .HasMaxLength(20)
                .HasDefaultValue("Opportunity")
                .IsRequired();

            activity.HasIndex("OpportunityId");
        });

        // Tasks (owned collection)
        builder.OwnsMany(o => o.Tasks, task =>
        {
            task.ToTable("tasks");

            task.Property<Guid>("Id")
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            task.HasKey("Id");

            task.Property(t => t.TaskId)
                .HasColumnName("task_id")
                .IsRequired();

            task.Property(t => t.Title)
                .HasColumnName("title")
                .HasMaxLength(500)
                .IsRequired();

            task.Property(t => t.DueDate)
                .HasColumnName("due_date")
                .IsRequired();

            task.Property(t => t.Priority)
                .HasColumnName("priority")
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            task.Property(t => t.Completed)
                .HasColumnName("completed")
                .IsRequired();

            task.Property(t => t.CompletedAt)
                .HasColumnName("completed_at");

            task.Property(t => t.CreatedBy)
                .HasColumnName("created_by")
                .IsRequired();

            task.Property(t => t.CompletedBy)
                .HasColumnName("completed_by");

            // Foreign key to Opportunity
            task.Property<Guid>("OpportunityId")
                .HasColumnName("entity_id")
                .IsRequired();

            task.Property<string>("EntityType")
                .HasColumnName("entity_type")
                .HasMaxLength(20)
                .HasDefaultValue("Opportunity")
                .IsRequired();

            task.HasIndex("OpportunityId");
        });

        // Indexes
        builder.HasIndex(o => o.TenantId)
            .HasDatabaseName("ix_opportunities_tenant_id");

        builder.HasIndex(o => o.Status)
            .HasDatabaseName("ix_opportunities_status");

        builder.HasIndex(o => o.AssignedTo)
            .HasDatabaseName("ix_opportunities_assigned_to");

        builder.HasIndex(o => o.LeadRef)
            .HasDatabaseName("ix_opportunities_lead_ref");

        // Ignore domain events (not persisted)
        builder.Ignore("DomainEvents");
    }
}
