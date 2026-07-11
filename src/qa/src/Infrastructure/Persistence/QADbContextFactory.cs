using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence;

/// <summary>
/// Design-time DbContext factory for EF Core migrations.
/// Required for dotnet-ef CLI to discover and create migrations.
/// </summary>
public class QADbContextFactory : IDesignTimeDbContextFactory<QADbContext>
{
    public QADbContext CreateDbContext(string[] args)
    {
        var connectionString = "Host=localhost;Port=5432;Database=qa_dev;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<QADbContext>()
            .UseNpgsql(connectionString);

        return new QADbContext(optionsBuilder.Options);
    }
}
