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
    public DMSDbContext(DbContextOptions<DMSDbContext> options) : base(options) { }

    public DbSet<Document> Documents { get; set; }
    public DbSet<DocumentCategory> DocumentCategories { get; set; }
    public DbSet<Tag> Tags { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Schema
        modelBuilder.HasDefaultSchema("dms");

        // Entity configurations
        modelBuilder.ApplyConfiguration(new DocumentEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new DocumentCategoryEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new TagEntityTypeConfiguration());
    }
}
