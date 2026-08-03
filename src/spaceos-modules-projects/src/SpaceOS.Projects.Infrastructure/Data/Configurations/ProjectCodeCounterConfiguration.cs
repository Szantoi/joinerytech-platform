using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Projects.Infrastructure.Data;

namespace SpaceOS.Projects.Infrastructure.Data.Configurations;

/// <summary>Maps the per-tenant, per-year project code counter (ADR-072 §7.3).</summary>
public sealed class ProjectCodeCounterConfiguration : IEntityTypeConfiguration<ProjectCodeCounter>
{
    /// <summary>The table backing the counter.</summary>
    public const string TableName = "project_code_counters";

    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<ProjectCodeCounter> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable(TableName);

        // The composite key IS the uniqueness the ON CONFLICT clause targets — a separate surrogate
        // id would leave "one counter per tenant and year" to a second, droppable index.
        builder.HasKey(counter => new { counter.TenantId, counter.Year });

        builder.Property(counter => counter.TenantId).IsRequired();
        builder.Property(counter => counter.Year).IsRequired();
        builder.Property(counter => counter.LastValue).IsRequired();
    }
}
