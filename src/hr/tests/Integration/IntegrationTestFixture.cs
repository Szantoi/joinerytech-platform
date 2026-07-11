using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.HR.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Integration;

/// <summary>
/// Base fixture for integration tests using Testcontainers PostgreSQL.
/// Handles container lifecycle and DbContext creation.
/// </summary>
public class IntegrationTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    private HRDbContext? _context;

    public IntegrationTestFixture()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("hr_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        // Create DbContext
        var options = new DbContextOptionsBuilder<HRDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        _context = new HRDbContext(options);

        // Apply migrations
        await _context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (_context != null)
        {
            await _context.DisposeAsync();
        }

        await _container.StopAsync();
    }

    public HRDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<HRDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        return new HRDbContext(options);
    }

    public string GetConnectionString() => _container.GetConnectionString();
}

/// <summary>
/// Xunit collection fixture for sharing PostgreSQL container across tests.
/// </summary>
[CollectionDefinition("HR Integration Tests")]
public class HRIntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>
{
    // This class has no code, and is never created. Its purpose is simply
    // to define the collection that tests can be added to.
}
