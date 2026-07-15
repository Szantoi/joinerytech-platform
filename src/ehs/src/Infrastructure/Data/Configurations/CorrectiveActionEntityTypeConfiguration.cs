using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for CorrectiveAction — the UNIFIED CAPA table.
/// Promoted from an Incident-owned entity to a first-class entity so
/// incident-, safety-walk- and risk-assessment-sourced actions share one table
/// (single CAPA board). The Incident navigation is kept as a regular
/// one-to-many relationship on the nullable incident_id FK.
/// </summary>
public class CorrectiveActionEntityTypeConfiguration : IEntityTypeConfiguration<CorrectiveAction>
{
    public void Configure(EntityTypeBuilder<CorrectiveAction> builder)
    {
        builder.ToTable("corrective_actions", "ehs");
        builder.HasKey(a => a.CorrectiveActionId);

        builder.Property(a => a.CorrectiveActionId)
            .IsRequired()
            .HasColumnName("corrective_action_id");

        // TenantId for RLS + unified CAPA board query
        builder.Property(a => a.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(a => a.TenantId)
            .HasDatabaseName("ix_corrective_actions_tenant_id");

        builder.Property(a => a.Source)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("source");
        builder.HasIndex(a => a.Source)
            .HasDatabaseName("ix_corrective_actions_source");

        builder.Property(a => a.SourceId)
            .IsRequired()
            .HasColumnName("source_id");
        builder.HasIndex(a => a.SourceId)
            .HasDatabaseName("ix_corrective_actions_source_id");

        builder.Property(a => a.IncidentId)
            .HasColumnName("incident_id");
        builder.HasIndex(a => a.IncidentId)
            .HasDatabaseName("ix_corrective_actions_incident_id");

        builder.Property(a => a.FindingId)
            .HasColumnName("finding_id");

        builder.Property(a => a.Description)
            .IsRequired()
            .HasMaxLength(1000)
            .HasColumnName("description");

        builder.Property(a => a.AssignedTo)
            .IsRequired()
            .HasColumnName("assigned_to");
        builder.HasIndex(a => a.AssignedTo)
            .HasDatabaseName("ix_corrective_actions_assigned_to");

        builder.Property(a => a.DueDate)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("due_date");

        builder.Property(a => a.CompletedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("completed_at");
    }
}
