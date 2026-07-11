using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Configurations;

/// <summary>
/// Entity Type Configuration for Ticket aggregate.
/// Maps Ticket with owned collection ResolutionAction and RLS support.
/// </summary>
public class TicketEntityTypeConfiguration : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {
        builder.ToTable("tickets", "qa");
        builder.HasKey(t => t.Id);

        // StronglyTypedId conversion for TicketId
        builder.Property(t => t.Id)
            .HasConversion(
                id => id.Value,
                value => new TicketId(value))
            .HasColumnName("id");

        // TenantId for RLS
        builder.Property(t => t.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(t => t.TenantId)
            .HasDatabaseName("ix_tickets_tenant_id");

        // Enums
        builder.Property(t => t.TicketType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("ticket_type");

        builder.Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");

        builder.Property(t => t.Priority)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("priority");

        // Foreign keys (nullable)
        builder.Property(t => t.OrderId)
            .HasColumnName("order_id");

        builder.Property(t => t.ProductId)
            .HasColumnName("product_id");

        builder.Property(t => t.InspectionId)
            .HasColumnName("inspection_id");

        // String properties
        builder.Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("title");

        builder.Property(t => t.Description)
            .IsRequired()
            .HasMaxLength(2000)
            .HasColumnName("description");

        builder.Property(t => t.ResolutionNotes)
            .HasMaxLength(2000)
            .HasColumnName("resolution_notes");

        // User references
        builder.Property(t => t.ReportedBy)
            .IsRequired()
            .HasColumnName("reported_by");

        builder.Property(t => t.AssignedTo)
            .HasColumnName("assigned_to");

        // Timestamps
        builder.Property(t => t.ReportedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("reported_at");

        builder.Property(t => t.AssignedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("assigned_at");

        builder.Property(t => t.StartedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("started_at");

        builder.Property(t => t.ResolvedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("resolved_at");

        // Owned collection: ResolutionAction → ticket_resolution_actions table
        builder.OwnsMany(t => t.ResolutionActions, actions =>
        {
            actions.ToTable("ticket_resolution_actions", "qa");
            actions.WithOwner().HasForeignKey("ticket_id");

            actions.Property(a => a.Id)
                .IsRequired()
                .HasMaxLength(36)
                .HasColumnName("id");

            actions.Property(a => a.ActionType)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired()
                .HasColumnName("action_type");

            actions.Property(a => a.Description)
                .IsRequired()
                .HasMaxLength(1000)
                .HasColumnName("description");

            // Money value object configuration (nested owned type)
            actions.OwnsOne(a => a.Cost, cost =>
            {
                cost.Property(m => m.Amount)
                    .HasColumnName("cost_amount")
                    .HasColumnType("decimal(18,2)")
                    .IsRequired();

                cost.Property(m => m.Currency)
                    .HasColumnName("cost_currency")
                    .HasMaxLength(3)
                    .IsRequired();
            });
        });

        // Indexes
        builder.HasIndex(t => t.Status)
            .HasDatabaseName("ix_tickets_status");
        builder.HasIndex(t => t.ReportedAt)
            .HasDatabaseName("ix_tickets_reported_at");
        builder.HasIndex(t => t.AssignedTo)
            .HasDatabaseName("ix_tickets_assigned_to");
    }
}
