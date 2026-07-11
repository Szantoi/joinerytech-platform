using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Configurations;

/// <summary>
/// Absence aggregate entity type configuration with RLS support.
/// </summary>
public class AbsenceEntityTypeConfiguration : IEntityTypeConfiguration<Absence>
{
    public void Configure(EntityTypeBuilder<Absence> builder)
    {
        builder.ToTable("absences", "hr");

        // Primary key
        builder.HasKey(a => a.Id);

        // StronglyTypedId conversion (DMS pattern)
        builder.Property(a => a.Id)
            .HasConversion(
                id => id.Value,
                value => new AbsenceId(value)
            )
            .IsRequired();

        // TenantId for RLS (multi-tenancy)
        builder.Property(a => a.TenantId)
            .IsRequired();

        builder.HasIndex(a => a.TenantId)
            .HasDatabaseName("ix_absences_tenant_id");

        // EmployeeId (foreign key)
        builder.Property(a => a.EmployeeId)
            .HasConversion(
                id => id.Value,
                value => new EmployeeId(value)
            )
            .IsRequired();

        builder.HasIndex(a => a.EmployeeId)
            .HasDatabaseName("ix_absences_employee_id");

        // Type (enum as string)
        builder.Property(a => a.Type)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // StartDate
        builder.Property(a => a.StartDate)
            .IsRequired();

        // EndDate
        builder.Property(a => a.EndDate)
            .IsRequired();

        // WorkDays
        builder.Property(a => a.WorkDays)
            .IsRequired();

        // Status (enum as string) - FSM state
        builder.Property(a => a.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // Reason
        builder.Property(a => a.Reason)
            .HasMaxLength(500)
            .IsRequired();

        // ApprovedByUserId
        builder.Property(a => a.ApprovedByUserId);

        // ApprovedAt
        builder.Property(a => a.ApprovedAt);

        // RejectedByUserId
        builder.Property(a => a.RejectedByUserId);

        // RejectedAt
        builder.Property(a => a.RejectedAt);

        // RejectionReason
        builder.Property(a => a.RejectionReason)
            .HasMaxLength(500);
    }
}
