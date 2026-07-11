using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Integration;

/// <summary>
/// Base fixture for integration tests using Testcontainers PostgreSQL.
/// Handles container lifecycle, DbContext creation, and migration application.
/// </summary>
public class IntegrationTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    private QADbContext? _context;

    public IntegrationTestFixture()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("qa_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        // Create DbContext
        var options = new DbContextOptionsBuilder<QADbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        _context = new QADbContext(options);

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

    public QADbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<QADbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        return new QADbContext(options);
    }

    public string GetConnectionString() => _container.GetConnectionString();
}

/// <summary>
/// xUnit collection fixture for sharing PostgreSQL container across tests.
/// </summary>
[CollectionDefinition("QA Integration Tests")]
public class QAIntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>
{
    // This class has no code, and is never created. Its purpose is simply
    // to define the collection that tests can be added to.
}
