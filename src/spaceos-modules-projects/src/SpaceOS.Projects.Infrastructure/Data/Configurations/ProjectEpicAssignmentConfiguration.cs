using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Infrastructure.Data.Configurations;

/// <summary>Maps the project ↔ Kernel flow-epic membership.</summary>
public sealed class ProjectEpicAssignmentConfiguration : IEntityTypeConfiguration<ProjectEpicAssignment>
{
    /// <summary>The table backing the membership.</summary>
    public const string TableName = "project_epic_assignments";

    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<ProjectEpicAssignment> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable(TableName);
        builder.HasKey(assignment => assignment.Id);

        builder.Property(assignment => assignment.Id).ValueGeneratedNever();
        builder.Property(assignment => assignment.ProjectId).IsRequired();
        builder.Property(assignment => assignment.TenantId).IsRequired();
        builder.Property(assignment => assignment.EpicId).IsRequired();
        builder.Property(assignment => assignment.AssignedAtUtc).IsRequired();

        // THE invariant of this module, enforced where a race cannot get past it: one epic, one
        // project, within a tenant. Project.EnsureEpicUnassigned reads the current owner and then
        // writes — two concurrent assignments both read "free". Only this index stops the second.
        // Per tenant, not global: a global index would reject an epic claimed inside ANOTHER
        // tenant and thereby answer a question about it (see ProjectEpicAssignment.TenantId).
        builder.HasIndex(assignment => new { assignment.TenantId, assignment.EpicId })
            .IsUnique()
            .HasDatabaseName("IX_project_epic_assignments_TenantId_EpicId");

        // The owner lookup (IProjectRepository.FindOwningProjectIdAsync) reads by epic; the
        // unique index above already serves it, so no second index is added for the same columns.
        builder.HasIndex(assignment => assignment.ProjectId)
            .HasDatabaseName("IX_project_epic_assignments_ProjectId");
    }
}
