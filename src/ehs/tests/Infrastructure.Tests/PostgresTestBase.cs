using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Base class for PostgreSQL integration tests using Testcontainers.
/// Provides a fresh database for each test class.
/// </summary>
public abstract class PostgresTestBase : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    protected EhsDbContext DbContext { get; private set; } = null!;

    protected PostgresTestBase()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("ehs_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();
    }

    /// <summary>
    /// Initializes the test container and applies migrations.
    /// Called once per test class.
    /// </summary>
    public async Task InitializeAsync()
    {
        await _container.StartAsync().ConfigureAwait(false);

        var options = new DbContextOptionsBuilder<EhsDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        DbContext = new EhsDbContext(options);

        // Apply migrations
        await DbContext.Database.MigrateAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Stops the test container.
    /// Called once per test class.
    /// </summary>
    public async Task DisposeAsync()
    {
        await DbContext.DisposeAsync().ConfigureAwait(false);
        await _container.DisposeAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a new DbContext instance (for multi-context scenarios).
    /// </summary>
    protected EhsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<EhsDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        return new EhsDbContext(options);
    }

    /// <summary>
    /// Clears all data from the database (for test isolation).
    /// </summary>
    protected async Task ClearDatabaseAsync()
    {
        DbContext.Incidents.RemoveRange(DbContext.Incidents);
        DbContext.RiskAssessments.RemoveRange(DbContext.RiskAssessments);
        DbContext.TrainingRecords.RemoveRange(DbContext.TrainingRecords);
        await DbContext.SaveChangesAsync().ConfigureAwait(false);
    }
}
