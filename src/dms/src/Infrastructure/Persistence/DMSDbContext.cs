using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Modules.DMS.Infrastructure.Persistence.Configurations;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence;

/// <summary>
/// DMS Module DbContext with multi-tenant support via Row-Level Security (RLS).
/// Handles the Document (approval workflow + version chain — DMS-BE-HOST),
/// DocumentCategory and Tag aggregates.
/// </summary>
public class DMSDbContext : DbContext
{
    private readonly SpaceOS.Modules.Hosting.Tenancy.ITenantContext? _tenantContext;

    public DMSDbContext(DbContextOptions<DMSDbContext> options) : base(options) { }

    /// <summary>
    /// DI constructor carrying the shared tenant context so the second isolation layer
    /// (tenant query filters, ADR-062) is active in hosts. Tools/tests using the
    /// options-only constructor run without the filter (RLS still guards in PostgreSQL).
    /// </summary>
    public DMSDbContext(
        DbContextOptions<DMSDbContext> options,
        SpaceOS.Modules.Hosting.Tenancy.ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Document> Documents { get; set; }
    public DbSet<DocumentCategory> DocumentCategories { get; set; }
    public DbSet<Tag> Tags { get; set; }

    /// <summary>
    /// Current tenant for the Document filter (module-local TenantId value object);
    /// null disables the filter (kernel pattern — background/tooling scope).
    /// </summary>
    private Domain.ValueObjects.TenantId? CurrentDocumentTenantId =>
        _tenantContext is { HasTenant: true } ? new(_tenantContext.TenantId) : null;

    /// <summary>
    /// Current tenant for the DocumentCategory/Tag filters (kernel TenantId value
    /// object); null disables the filter.
    /// </summary>
    private SpaceOS.Kernel.Domain.ValueObjects.TenantId? CurrentKernelTenantId =>
        _tenantContext is { HasTenant: true }
            ? SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(_tenantContext.TenantId)
            : null;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Schema
        modelBuilder.HasDefaultSchema("dms");

        // Entity configurations
        modelBuilder.ApplyConfiguration(new DocumentEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new DocumentCategoryEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new TagEntityTypeConfiguration());

        // ADR-062 second isolation layer: tenant query filter on every aggregate root
        // (kernel AppDbContext pattern). RLS is the first layer; this guards against a
        // forgotten WHERE, a FORCE-less table or a misconfigured deploy role.
        // Soft-delete stays a repository concern (Status != Deleted in the read paths).
        modelBuilder.Entity<Document>()
            .HasQueryFilter(d => CurrentDocumentTenantId == null || d.TenantId == CurrentDocumentTenantId);
        modelBuilder.Entity<DocumentCategory>()
            .HasQueryFilter(c => CurrentKernelTenantId == null || c.TenantId == CurrentKernelTenantId);
        modelBuilder.Entity<Tag>()
            .HasQueryFilter(t => CurrentKernelTenantId == null || t.TenantId == CurrentKernelTenantId);
    }
}
