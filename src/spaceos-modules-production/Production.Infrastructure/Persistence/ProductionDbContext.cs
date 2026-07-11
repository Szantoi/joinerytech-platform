using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Production.Domain.ProductionJobs;

namespace SpaceOS.Modules.Production.Infrastructure.Persistence;

/// <summary>
/// Production module DbContext (EF Core)
/// </summary>
public class ProductionDbContext : DbContext
{
    public DbSet<ProductionJob> ProductionJobs { get; set; } = null!;

    public ProductionDbContext(DbContextOptions<ProductionDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("production");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductionDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
