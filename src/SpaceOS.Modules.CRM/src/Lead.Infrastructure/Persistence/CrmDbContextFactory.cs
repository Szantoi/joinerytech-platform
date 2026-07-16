using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence;

/// <summary>
/// Design-time DbContext factory for EF Core migrations (QA
/// <c>QADbContextFactory</c> precedent). Required so the dotnet-ef CLI can build
/// the model without booting the host; the connection string here is never used
/// at runtime — the host supplies <c>ConnectionStrings:CrmDatabase</c>.
/// </summary>
public sealed class CrmDbContextFactory : IDesignTimeDbContextFactory<CrmDbContext>
{
    public CrmDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<CrmDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=crm_dev;Username=postgres;Password=postgres");

        return new CrmDbContext(optionsBuilder.Options);
    }
}
