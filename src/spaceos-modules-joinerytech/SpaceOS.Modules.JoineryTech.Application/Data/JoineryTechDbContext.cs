using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.JoineryTech.Domain.Entities;

namespace SpaceOS.Modules.JoineryTech.Application.Data;

/// <summary>
/// EF Core DbContext for the JoineryTech module.
/// Handles multi-tenant data access with Row-Level Security (RLS) enforcement.
/// </summary>
public class JoineryTechDbContext : DbContext
{
    public JoineryTechDbContext(DbContextOptions<JoineryTechDbContext> options)
        : base(options)
    {
    }

    // Core entities
    public DbSet<Tenant> Tenants { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    // Catalog entities
    public DbSet<CatalogCategory> CatalogCategories { get; set; } = null!;
    public DbSet<CatalogItem> CatalogItems { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // NOTE: Entity configurations are in Infrastructure layer
        // They will be applied when Infrastructure registers the DbContext
        // modelBuilder.ApplyConfigurationsFromAssembly(typeof(JoineryTechDbContext).Assembly);
    }

    /// <summary>
    /// Sets the PostgreSQL GUC parameter for multi-tenant RLS enforcement.
    /// MUST be called before any queries in multi-tenant context.
    /// </summary>
    /// <param name="tenantId">The tenant ID to set for RLS filtering.</param>
    public async Task SetTenantContextAsync(Guid tenantId, CancellationToken ct = default)
    {
        // PostgreSQL GUC parameter: app.tenant_id
        // RLS policies use: current_setting('app.tenant_id')::uuid
        var sql = $"SET LOCAL app.tenant_id = '{tenantId}';";
        await Database.ExecuteSqlRawAsync(sql, ct).ConfigureAwait(false);
    }
}
