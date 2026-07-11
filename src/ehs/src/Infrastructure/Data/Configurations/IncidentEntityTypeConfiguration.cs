using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Type Configuration for Incident aggregate.
/// Maps Incident with owned entities: Investigation (0-1), CorrectiveActions (0-n), Witnesses (0-n)
/// </summary>
public class IncidentEntityTypeConfiguration : IEntityTypeConfiguration<Incident>
{
    public void Configure(EntityTypeBuilder<Incident> builder)
    {
        builder.ToTable("incidents", "ehs");
        builder.HasKey(i => i.IncidentId);

        // Primary key
        builder.Property(i => i.IncidentId)
            .IsRequired()
            .HasColumnName("incident_id");

        // TenantId for RLS
        builder.Property(i => i.TenantId)
            .IsRequired()
            .HasColumnName("tenant_id");
        builder.HasIndex(i => i.TenantId)
            .HasDatabaseName("ix_incidents_tenant_id");

        // Enums as strings
        builder.Property(i => i.IncidentType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("incident_type");

        builder.Property(i => i.Severity)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("severity");

        builder.Property(i => i.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("status");

        // Scalar properties
        builder.Property(i => i.IncidentDate)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("incident_date");

        builder.Property(i => i.Location)
            .IsRequired()
            .HasMaxLength(500)
            .HasColumnName("location");

        builder.Property(i => i.Description)
            .IsRequired()
            .HasMaxLength(2000)
            .HasColumnName("description");

        builder.Property(i => i.ReportedBy)
            .IsRequired()
            .HasColumnName("reported_by");

        builder.Property(i => i.ReportedAt)
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasColumnName("reported_at");

        builder.Property(i => i.InvestigatedBy)
            .HasColumnName("investigated_by");

        builder.Property(i => i.InvestigatedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("investigated_at");

        builder.Property(i => i.ClosedAt)
            .HasColumnType("timestamp with time zone")
            .HasColumnName("closed_at");

        // Indexes
        builder.HasIndex(i => i.Status)
            .HasDatabaseName("ix_incidents_status");

        builder.HasIndex(i => i.IncidentDate)
            .HasDatabaseName("ix_incidents_incident_date");

        // Owned entity: Investigation (0-1) → incident_investigations table
        builder.OwnsOne(i => i.Investigation, investigation =>
        {
            investigation.ToTable("incident_investigations", "ehs");
            investigation.WithOwner().HasForeignKey("incident_id");

            investigation.Property(inv => inv.IncidentInvestigationId)
                .IsRequired()
                .HasColumnName("incident_investigation_id");

            investigation.Property(inv => inv.IncidentId)
                .IsRequired()
                .HasColumnName("incident_id");

            investigation.Property(inv => inv.Findings)
                .IsRequired()
                .HasMaxLength(2000)
                .HasColumnName("findings");

            investigation.Property(inv => inv.RootCause)
                .IsRequired()
                .HasMaxLength(2000)
                .HasColumnName("root_cause");

            investigation.Property(inv => inv.Recommendations)
                .HasMaxLength(2000)
                .HasColumnName("recommendations");

            investigation.Property(inv => inv.InvestigatedBy)
                .IsRequired()
                .HasColumnName("investigated_by");

            investigation.Property(inv => inv.CompletedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone")
                .HasColumnName("completed_at");

            investigation.HasIndex("incident_id")
                .HasDatabaseName("ix_incident_investigations_incident_id");
        });

        // Owned collection: CorrectiveActions (0-n) → incident_corrective_actions table
        builder.OwnsMany(i => i.CorrectiveActions, actions =>
        {
            actions.ToTable("incident_corrective_actions", "ehs");
            actions.WithOwner().HasForeignKey("incident_id");

            actions.Property(a => a.CorrectiveActionId)
                .IsRequired()
                .HasColumnName("corrective_action_id");

            actions.Property(a => a.IncidentId)
                .IsRequired()
                .HasColumnName("incident_id");

            actions.Property(a => a.Description)
                .IsRequired()
                .HasMaxLength(1000)
                .HasColumnName("description");

            actions.Property(a => a.AssignedTo)
                .IsRequired()
                .HasColumnName("assigned_to");

            actions.Property(a => a.DueDate)
                .IsRequired()
                .HasColumnType("timestamp with time zone")
                .HasColumnName("due_date");

            actions.Property(a => a.CompletedAt)
                .HasColumnType("timestamp with time zone")
                .HasColumnName("completed_at");

            actions.HasIndex("incident_id")
                .HasDatabaseName("ix_incident_corrective_actions_incident_id");
        });

        // Owned collection: Witnesses (0-n) → incident_witnesses table
        builder.OwnsMany(i => i.Witnesses, witnesses =>
        {
            witnesses.ToTable("incident_witnesses", "ehs");
            witnesses.WithOwner().HasForeignKey("incident_id");

            witnesses.Property(w => w.IncidentWitnessId)
                .IsRequired()
                .HasColumnName("incident_witness_id");

            witnesses.Property(w => w.IncidentId)
                .IsRequired()
                .HasColumnName("incident_id");

            witnesses.Property(w => w.EmployeeId)
                .IsRequired()
                .HasColumnName("employee_id");

            witnesses.Property(w => w.Statement)
                .IsRequired()
                .HasMaxLength(2000)
                .HasColumnName("statement");

            witnesses.Property(w => w.RecordedAt)
                .IsRequired()
                .HasColumnType("timestamp with time zone")
                .HasColumnName("recorded_at");

            witnesses.HasIndex("incident_id")
                .HasDatabaseName("ix_incident_witnesses_incident_id");
        });
    }
}
