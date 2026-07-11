using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Entities;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Infrastructure.Configurations;

/// <summary>
/// EF Core entity configuration for Lead aggregate
/// </summary>
public class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> builder)
    {
        builder.ToTable("leads");

        // Primary key
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id)
            .HasColumnName("id")
            .IsRequired();

        // FSM State
        builder.Property(l => l.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // LeadSource enum
        builder.Property(l => l.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // ContactInfo value object (owned type)
        builder.OwnsOne(l => l.ContactInfo, contact =>
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

        // Metadata fields
        builder.Property(l => l.AssignedTo)
            .HasColumnName("assigned_to")
            .IsRequired();

        builder.Property(l => l.OpportunityRef)
            .HasColumnName("opportunity_ref");

        builder.Property(l => l.DisqualificationReason)
            .HasColumnName("disqualification_reason")
            .HasMaxLength(500);

        builder.Property(l => l.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(l => l.UpdatedAt)
            .HasColumnName("updated_at");

        builder.Property(l => l.TenantId)
            .HasColumnName("tenant_id")
            .IsRequired();

        // Activities (owned collection)
        builder.OwnsMany(l => l.Activities, activity =>
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

            // Foreign key to Lead
            activity.Property<Guid>("LeadId")
                .HasColumnName("entity_id")
                .IsRequired();

            activity.Property<string>("EntityType")
                .HasColumnName("entity_type")
                .HasMaxLength(20)
                .HasDefaultValue("Lead")
                .IsRequired();

            activity.HasIndex("LeadId");
        });

        // Tasks (owned collection)
        builder.OwnsMany(l => l.Tasks, task =>
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

            // Foreign key to Lead
            task.Property<Guid>("LeadId")
                .HasColumnName("entity_id")
                .IsRequired();

            task.Property<string>("EntityType")
                .HasColumnName("entity_type")
                .HasMaxLength(20)
                .HasDefaultValue("Lead")
                .IsRequired();

            task.HasIndex("LeadId");
        });

        // Indexes
        builder.HasIndex(l => l.TenantId)
            .HasDatabaseName("ix_leads_tenant_id");

        builder.HasIndex(l => l.Status)
            .HasDatabaseName("ix_leads_status");

        builder.HasIndex(l => l.AssignedTo)
            .HasDatabaseName("ix_leads_assigned_to");

        // Ignore domain events (not persisted)
        builder.Ignore("DomainEvents");
    }
}
