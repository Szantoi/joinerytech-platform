using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

/// <summary>
/// Design-time DbContext factory for EF Core migrations.
/// </summary>
public class MaintenanceDbContextFactory : IDesignTimeDbContextFactory<MaintenanceDbContext>
{
    public MaintenanceDbContext CreateDbContext(string[] args)
    {
        var connectionString = "Host=localhost;Port=5432;Database=maintenance_dev;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<MaintenanceDbContext>()
            .UseNpgsql(connectionString);

        return new MaintenanceDbContext(optionsBuilder.Options);
    }
}
