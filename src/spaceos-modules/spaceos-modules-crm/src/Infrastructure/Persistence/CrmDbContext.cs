using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Infrastructure.Configurations;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence;

/// <summary>
/// CRM module DbContext with PostgreSQL, RLS, and multi-tenancy
/// </summary>
public class CrmDbContext : DbContext
{
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Opportunity> Opportunities => Set<Opportunity>();

    public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply entity configurations
        modelBuilder.ApplyConfiguration(new LeadConfiguration());
        modelBuilder.ApplyConfiguration(new OpportunityConfiguration());

        // Set default schema
        modelBuilder.HasDefaultSchema("crm");
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);

        // Use lowercase table names
        configurationBuilder.Properties<string>()
            .HaveMaxLength(500);
    }
}
