# Testcontainers .NET Setup Pattern

**Use case:** Integration testing with PostgreSQL, Keycloak containers

## 1. NuGet Package

```bash
dotnet add package Testcontainers.PostgreSql
dotnet add package Testcontainers.Keycloak
```

## 2. Base Test Class (Fixture)

```csharp
public class TestContainerFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres;
    private readonly KeycloakContainer _keycloak;
    public PostgreSqlFixture PostgresFixture { get; }

    public TestContainerFixture()
    {
        _postgres = new PostgreSqlBuilder()
            .WithImage("postgres:15")
            .WithDatabase("spaceos_test")
            .WithUsername("test_user")
            .WithPassword("test_password")
            .Build();

        _keycloak = new KeycloakBuilder()
            .WithImage("quay.io/keycloak/keycloak:latest")
            .WithAdminUsername("admin")
            .WithAdminPassword("admin")
            .Build();

        PostgresFixture = new PostgreSqlFixture(_postgres);
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        await _keycloak.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _postgres.StopAsync();
        await _keycloak.StopAsync();
    }

    public string GetConnectionString() => _postgres.GetConnectionString();
    public string GetKeycloakBaseUrl() => $"http://localhost:{_keycloak.Port}";
}

[CollectionDefinition("Test Container Collection")]
public class TestContainerCollection : ICollectionFixture<TestContainerFixture>
{
}
```

## 3. Test Class

```csharp
[Collection("Test Container Collection")]
public class OrderTests
{
    private readonly TestContainerFixture _fixture;

    public OrderTests(TestContainerFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task CreateOrder_WithValidData_ShouldInsert()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<CuttingDbContext>()
            .UseNpgsql(_fixture.GetConnectionString())
            .Options;

        using var context = new CuttingDbContext(options);
        await context.Database.MigrateAsync();

        var order = new PublicQuoteRequest
        {
            Id = Guid.NewGuid(),
            CustomerName = "Test Customer",
            Material = "wood",
            Status = "received"
        };

        // Act
        context.PublicQuoteRequests.Add(order);
        await context.SaveChangesAsync();

        // Assert
        var saved = await context.PublicQuoteRequests
            .FirstOrDefaultAsync(x => x.Id == order.Id);

        Assert.NotNull(saved);
        Assert.Equal("Test Customer", saved.CustomerName);
    }
}
```

**See also:** [DATABASE_PATTERNS.md](../patterns/DATABASE_PATTERNS.md)
