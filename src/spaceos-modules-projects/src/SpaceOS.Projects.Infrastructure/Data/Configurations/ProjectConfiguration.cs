using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Infrastructure.Data.Configurations;

/// <summary>Maps the <see cref="Project"/> aggregate root.</summary>
public sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    /// <summary>The table backing the aggregate.</summary>
    public const string TableName = "projects";

    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable(TableName);
        builder.HasKey(project => project.Id);

        builder.Property(project => project.Id).ValueGeneratedNever();
        builder.Property(project => project.TenantId).IsRequired();

        // The value object is stored as its string, converted in one place. A comparer is given
        // explicitly because ProjectCode is a reference type: without one EF compares instances
        // by reference and can miss a change (or, worse, report one that did not happen).
        builder.Property(project => project.Code)
            .HasConversion(
                code => code.Value,
                value => ProjectCode.Create(value),
                new ValueComparer<ProjectCode>(
                    (left, right) => left!.Value == right!.Value,
                    code => code.Value.GetHashCode(StringComparison.Ordinal),
                    code => ProjectCode.Create(code.Value)))
            .HasColumnName("Code")
            .HasMaxLength(ProjectCode.MaxLength)
            .IsRequired();

        builder.Property(project => project.Name)
            .HasMaxLength(200)
            .IsRequired();

        // Stored as the integer the enum declares, not as its name: the five labels are a product
        // decision (ADR-072 §4) and renaming one in code must not silently repoint stored rows.
        builder.Property(project => project.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(project => project.CustomerId);

        // ADR-072 §7.2 — an optional, opaque origin. Two plain columns rather than an optional
        // owned type; the domain composes ProjectOrigin on the way out.
        builder.Property(project => project.OriginSystem)
            .HasMaxLength(ProjectOrigin.MaxSystemLength);
        builder.Property(project => project.OriginExternalId);
        builder.Ignore(project => project.Origin);

        builder.Property(project => project.CreatedAtUtc).IsRequired();

        // Plain integer optimistic concurrency: the domain increments it, so EF must not also
        // treat it as store-generated. IsConcurrencyToken makes a lost update a
        // DbUpdateConcurrencyException instead of a silent overwrite.
        builder.Property(project => project.RowVersion)
            .IsConcurrencyToken()
            .IsRequired();

        // The business key is unique WITHIN a tenant. Globally unique would mean one tenant's
        // numbering could collide with another's — and would leak that the other exists.
        builder.HasIndex(project => new { project.TenantId, project.Code })
            .IsUnique()
            .HasDatabaseName("IX_projects_TenantId_Code");

        builder.HasMany(project => project.Epics)
            .WithOne()
            .HasForeignKey(assignment => assignment.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // The backing field, not the read-only IReadOnlyList property — otherwise EF has no way
        // to materialise into the collection the aggregate actually guards.
        builder.Metadata
            .FindNavigation(nameof(Project.Epics))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}
