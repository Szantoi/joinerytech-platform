using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Infrastructure.Data;

/// <summary>
/// The projects persistence context. PostgreSQL RLS is the enforcing boundary; the query filters
/// are the second layer that stops an application bug from writing a cross-tenant query at all.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why the filters open up when no tenant is resolved.</b> With <c>CurrentTenantId</c> null the
/// predicate passes everything, which is the platform pattern (CRM, collaboration, the kernel).
/// That is not a hole in a deployed host: the same "no tenant" state makes
/// <c>SpaceOsTenantSessionInterceptor</c> write <c>''</c> into the session key, and the
/// <c>NULLIF(..., '')</c> policies then return zero rows regardless of what EF asked for.
/// <b>But it does mean the no-tenant path has exactly one layer behind it</b> — the interceptor
/// plus RLS — which is why <c>InterceptorEndToEndTests</c> guards it explicitly rather than
/// trusting that some other test would notice.
/// </para>
/// <para>
/// <b>Both entities are filtered.</b> Unlike collaboration's tenant-less children, an epic
/// assignment carries its own <c>TenantId</c> (it needs one for the uniqueness index that makes
/// "an epic belongs to one project" hold under concurrency), so it gets the same single-column
/// filter as the parent rather than a navigation-based EXISTS that could drift from the policy.
/// </para>
/// </remarks>
public class ProjectsDbContext : DbContext
{
    /// <summary>The module's PostgreSQL schema (ADR-067 module conventions).</summary>
    public const string SchemaName = "projects";

    private readonly ITenantContext? _tenantContext;

    /// <summary>The projects visible to the caller.</summary>
    public DbSet<Project> Projects => Set<Project>();

    /// <summary>
    /// Creates the context without a tenant — design-time tooling, startup migrations and tests
    /// that own their isolation. The filters pass everything in this mode; see the remarks.
    /// </summary>
    public ProjectsDbContext(DbContextOptions<ProjectsDbContext> options)
        : base(options)
    {
    }

    /// <summary>Creates the context for a host request, with the claims-backed tenant.</summary>
    public ProjectsDbContext(DbContextOptions<ProjectsDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        ArgumentNullException.ThrowIfNull(tenantContext);
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// The tenant the filters compare against, or <c>null</c> when none is resolved. Read as a
    /// property rather than captured at model-build time, so a scoped context always sees the
    /// tenant of the request it belongs to.
    /// </summary>
    protected Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema(SchemaName);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProjectsDbContext).Assembly);

        modelBuilder.Entity<Project>()
            .HasQueryFilter(p => CurrentTenantId == null || p.TenantId == CurrentTenantId);

        modelBuilder.Entity<ProjectEpicAssignment>()
            .HasQueryFilter(a => CurrentTenantId == null || a.TenantId == CurrentTenantId);

        // A counter row is tenant data too: how many projects a tenant has opened this year is
        // its business and nobody else's.
        modelBuilder.Entity<ProjectCodeCounter>()
            .HasQueryFilter(c => CurrentTenantId == null || c.TenantId == CurrentTenantId);

        // An idempotency record replays a tenant's own responses; another tenant reading it would
        // read response bodies that are not its own.
        modelBuilder.Entity<ProjectIdempotencyRecord>()
            .HasQueryFilter(r => CurrentTenantId == null || r.TenantId == CurrentTenantId);
    }
}
