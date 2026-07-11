using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core configuration for ProductionJob aggregate
/// </summary>
public class ProductionJobConfiguration : IEntityTypeConfiguration<ProductionJob>
{
    public void Configure(EntityTypeBuilder<ProductionJob> builder)
    {
        builder.ToTable("production_jobs");
        builder.HasKey(x => x.Id);

        // ProductionJobId value object conversion
        builder.Property(x => x.Id)
            .HasConversion(
                id => id.Value,
                value => ProductionJobId.From(value)
            )
            .HasColumnName("id");

        builder.Property(x => x.OrderId).HasColumnName("order_id").IsRequired();
        builder.Property(x => x.CustomerId).HasColumnName("customer_id").IsRequired();
        builder.Property(x => x.ProjectName).HasColumnName("project_name").HasMaxLength(200).IsRequired();
        builder.Property(x => x.Deadline).HasColumnName("deadline").IsRequired();
        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasColumnName("status")
            .IsRequired();
        builder.Property(x => x.StatusReason).HasColumnName("status_reason").HasMaxLength(500);
        builder.Property(x => x.AssetId).HasColumnName("asset_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();

        // WorkflowSteps as owned entities (collection)
        builder.OwnsMany(x => x.Steps, steps =>
        {
            steps.ToTable("workflow_steps");
            steps.WithOwner().HasForeignKey("ProductionJobId");
            steps.HasKey("Id");

            steps.Property(s => s.Id)
                .HasConversion(
                    id => id.Value,
                    value => WorkflowStepId.From(value)
                )
                .HasColumnName("id");

            steps.Property(s => s.Name)
                .HasConversion<string>()
                .HasColumnName("name")
                .IsRequired();

            steps.Property(s => s.Status)
                .HasConversion<string>()
                .HasColumnName("status")
                .IsRequired();

            steps.Property(s => s.StartedAt).HasColumnName("started_at");
            steps.Property(s => s.CompletedAt).HasColumnName("completed_at");
            steps.Property(s => s.PhotoUrl).HasColumnName("photo_url").HasMaxLength(500);
            steps.Property(s => s.CompletedBy).HasColumnName("completed_by").HasMaxLength(100);
        });

        // Ignore domain events (not persisted)
        builder.Ignore(x => x.DomainEvents);
    }
}
