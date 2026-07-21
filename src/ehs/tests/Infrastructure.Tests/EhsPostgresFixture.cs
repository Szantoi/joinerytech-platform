using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// xUnit collection fixture: ONE shared PostgreSQL Testcontainer for the entire
/// EHS Infrastructure.Tests assembly (STAB-EHS-INTEGRATION).
///
/// Replaces the former per-class container spin-up (the old <c>PostgresTestBase</c>
/// started a fresh Testcontainer in every test class's constructor/InitializeAsync).
/// Under xUnit's default parallelization (different test classes = different
/// collections = run in parallel) that meant 6+ PostgreSQL containers launching at
/// once on a 16 GB dev machine, producing connection-refused/timeout noise that
/// could surface as unrelated-looking failures. See
/// docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-EHS-INTEGRATION.md ("Végrehajtási
/// napló") for the root-cause investigation and evidence.
///
/// All test classes that need PostgreSQL join the <see cref="EhsInfrastructureCollection"/>
/// collection, which (by xUnit's collection semantics) also serializes them relative
/// to EACH OTHER — a deliberately narrow, justified boundary (one shared external
/// resource: the container), NOT a blanket assembly-level parallelization opt-out.
/// Per-test isolation is achieved by giving every test its own random tenant id
/// (already the pre-existing convention in every repository test — see each test
/// class's `_tenantId = Guid.NewGuid()` field) and its own short-lived
/// <see cref="EhsDbContext"/>, not by resetting shared tables between tests.
/// </summary>
public sealed class EhsPostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("ehs_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    private string ConnectionString => _container.GetConnectionString();

    /// <summary>Starts the single shared container and applies migrations once,
    /// through a throwaway short-lived context.</summary>
    public async Task InitializeAsync()
    {
        await _container.StartAsync().ConfigureAwait(false);

        await using var migrationContext = CreateDbContext();
        await migrationContext.Database.MigrateAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Stops and removes the shared container. xUnit invokes a collection fixture's
    /// DisposeAsync exactly once, after every test in the collection has finished —
    /// including when a test threw — so this always runs; no orphaned container
    /// should remain after a normal OR a failed run within one `dotnet test`
    /// invocation. (An interrupted/killed test *process* is a different failure
    /// mode — Testcontainers' own Ryuk reaper is the backstop for that case, same
    /// as before this change.)
    /// </summary>
    public async Task DisposeAsync() => await _container.DisposeAsync().ConfigureAwait(false);

    /// <summary>
    /// A fresh, short-lived <see cref="EhsDbContext"/> against the shared container.
    /// Every test (and this fixture's own migration step) gets its own instance —
    /// the same tracked entity is never hand-off between two different DbContext
    /// instances, which is a classic source of spurious
    /// <see cref="Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException"/>.
    /// </summary>
    public EhsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<EhsDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        return new EhsDbContext(options);
    }
}

/// <summary>
/// Binds <see cref="EhsPostgresFixture"/> to the "EHS Infrastructure Tests" xUnit
/// collection. Every PostgreSQL-backed test class in this assembly declares
/// <c>[Collection(EhsInfrastructureCollection.Name)]</c> to share the one container
/// instead of starting its own.
/// </summary>
[CollectionDefinition(Name)]
public sealed class EhsInfrastructureCollection : ICollectionFixture<EhsPostgresFixture>
{
    public const string Name = "EHS Infrastructure Tests";
}
