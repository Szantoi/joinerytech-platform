using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceOS.Modules.HR.Infrastructure.Data;

/// <summary>
/// Design-time factory for HrDbContext (used by EF Core migrations).
/// </summary>
public class HrDbContextFactory : IDesignTimeDbContextFactory<HrDbContext>
{
    public HrDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<HrDbContext>();

        // Use a dummy connection string for migrations (actual connection comes from DI at runtime)
        optionsBuilder.UseNpgsql("Host=localhost;Database=spaceos_hr_design;Username=postgres;Password=postgres");

        return new HrDbContext(optionsBuilder.Options);
    }
}
