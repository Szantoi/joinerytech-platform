using SpaceOS.Modules.Ehs.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Base class for EHS repository integration tests against the single shared
/// PostgreSQL Testcontainer (<see cref="EhsPostgresFixture"/>, STAB-EHS-INTEGRATION).
///
/// Each test method still gets its OWN short-lived <see cref="EhsDbContext"/> (a
/// new xUnit test-class instance is created per [Fact], so the constructor runs
/// per test) — only the underlying container is shared. Per-test isolation comes
/// from every test using its own random tenant id (`_tenantId = Guid.NewGuid()` in
/// each derived class), which every repository query already filters on, not from
/// resetting shared tables between tests.
/// </summary>
[Collection(EhsInfrastructureCollection.Name)]
public abstract class PostgresTestBase : IAsyncLifetime
{
    protected EhsDbContext DbContext { get; }

    protected PostgresTestBase(EhsPostgresFixture fixture)
    {
        DbContext = fixture.CreateDbContext();
    }

    public Task InitializeAsync() => Task.CompletedTask;

    /// <summary>
    /// Closes this test's own DbContext/connection. xUnit calls a test class's
    /// IAsyncLifetime.DisposeAsync unconditionally after the test runs — including
    /// on a thrown exception/assertion failure — so this never leaks a connection
    /// on a failing test. The shared container itself is torn down once by
    /// <see cref="EhsPostgresFixture.DisposeAsync"/> after the whole collection.
    /// </summary>
    public async Task DisposeAsync() => await DbContext.DisposeAsync().ConfigureAwait(false);
}
