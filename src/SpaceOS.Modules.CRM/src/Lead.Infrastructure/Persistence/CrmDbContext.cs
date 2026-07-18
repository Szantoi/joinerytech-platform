using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence;

/// <summary>
/// EF Core context for the CRM module (QA <c>QADbContext</c> precedent).
/// Schema: <c>crm</c>. Tenant isolation is layered (ADR-062): PostgreSQL RLS via the
/// EnableTenantRls migration + the shared session interceptor (first layer), tenant
/// query filters on the aggregate roots (second layer), and explicit tenant predicates
/// in the repositories (third layer).
/// </summary>
/// <remarks>
/// Before ADR-062 this comment claimed "RLS in the deployed database" while NO RLS
/// existed anywhere — the claim is only true since the 20260718080000_EnableTenantRls
/// migration.
/// </remarks>
public sealed class CrmDbContext : DbContext
{
    public const string SchemaName = "crm";

    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters) is active in hosts. Tools/tests using the options-only
    /// constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public CrmDbContext(
        DbContextOptions<CrmDbContext> options,
        SpaceOS.Modules.Hosting.Tenancy.ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Lead> Leads => Set<Lead>();

    public DbSet<Opportunity> Opportunities => Set<Opportunity>();

    /// <summary>Current tenant for the query filters; null disables the filter (kernel pattern).</summary>
    private Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(SchemaName);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CrmDbContext).Assembly);

        base.OnModelCreating(modelBuilder);

        // ADR-062 second isolation layer: tenant query filter on the aggregate roots
        // (kernel AppDbContext pattern); owned activity/task collections follow their root.
        modelBuilder.Entity<Lead>()
            .HasQueryFilter(l => CurrentTenantId == null || l.TenantId == CurrentTenantId);
        modelBuilder.Entity<Opportunity>()
            .HasQueryFilter(o => CurrentTenantId == null || o.TenantId == CurrentTenantId);
    }
}
