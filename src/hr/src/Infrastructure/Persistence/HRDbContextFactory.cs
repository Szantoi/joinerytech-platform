using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence;

/// <summary>
/// Design-time DbContext factory for EF Core migrations (QA precedent).
/// Required for the dotnet-ef CLI to discover and create migrations without
/// booting the host.
/// </summary>
public class HRDbContextFactory : IDesignTimeDbContextFactory<HRDbContext>
{
    public HRDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<HRDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=hr_dev;Username=postgres;Password=postgres");

        return new HRDbContext(optionsBuilder.Options);
    }
}
