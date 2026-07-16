using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence;

/// <summary>
/// EF Core context for the CRM module (QA <c>QADbContext</c> precedent).
/// Schema: <c>crm</c>. Tenant isolation is enforced by the repositories (and by
/// PostgreSQL RLS in the deployed database).
/// </summary>
public sealed class CrmDbContext : DbContext
{
    public const string SchemaName = "crm";

    public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
    {
    }

    public DbSet<Lead> Leads => Set<Lead>();

    public DbSet<Opportunity> Opportunities => Set<Opportunity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(SchemaName);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CrmDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}
