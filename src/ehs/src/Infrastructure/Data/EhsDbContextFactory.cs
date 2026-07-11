using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceOS.Modules.Ehs.Infrastructure.Data;

/// <summary>
/// Design-time factory for EhsDbContext (used by EF Core migrations).
/// Provides a temporary DbContext instance for migration generation.
/// </summary>
public class EhsDbContextFactory : IDesignTimeDbContextFactory<EhsDbContext>
{
    public EhsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<EhsDbContext>();

        // Use a temporary connection string for migrations
        // This won't connect to a real database, just generates migration files
        optionsBuilder.UseNpgsql(
            "Host=localhost;Database=spaceos_ehs_design;Username=postgres;Password=dev",
            b => b.MigrationsAssembly("SpaceOS.Modules.Ehs.Infrastructure"));

        return new EhsDbContext(optionsBuilder.Options);
    }
}
