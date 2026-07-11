---
name: testing-backend-dotnet
description: '.NET backend testing standards with xUnit, FluentAssertions and in-memory database tests. Use when writing or reviewing unit tests, integration tests, or test infrastructure for C# projects.'
domain: engineering
last_updated: 2026-02-24
---

# ?? Testing - Backend (.NET) Skill

**Summary:** Ez a skill biztosítja a .NET backend tesztelési szabványait, beleértve az xUnit, FluentAssertions és in-memory adatbázis teszteket.

## ?? Mikor töltsd be?

- **Unit Teszt**: Domain logika, Entitások, Service-ek tesztelése.
- **Integrációs Teszt**: Repository-k és EF Core mûveletek ellenõrzése in-memory adatbázissal.
- **Hibakeresés**: Ha a tesztek elbuknak a CI/CD pipeline-ban.

---

## ??? Architektúra és Szabályok

A projekt **xUnit**-ot használ tesztfuttatóként és **FluentAssertions**-t a kifejezõbb assertáláshoz.

### ??? Technológiai Stack

- **Framework**: xUnit
- **Assertion**: FluentAssertions (`result.Should().Be(...)`)
- **Mocking**: NSubstitute vagy Moq (projekt függõ)
- **Integration DB**: Microsoft.Data.Sqlite (In-Memory mód)

### ?? Tesztelési Konvenciók

- **AAA Pattern**: Arrange, Act, Assert.
- **Naming**: `[Method]_[Scenario]_[Result]` (pl. `Create_InvalidData_ThrowsException`).
- **Isolation**: Minden tesztnek függetlennek kell lennie (fõleg DB teszteknél).

---

## ?? Kód Minták (N-shot Patterns)

### 1. Unit Test Minta (FluentAssertions)

```csharp
using FluentAssertions;
using Xunit;

namespace JoineryTech.Flow.Core.Tests.Entities;

public class ProjectFluentTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreateProject()
    {
        // Arrange
        var title = "My Project";
        var description = "A test project";

        // Act
        var project = Project.Create(title, description);

        // Assert
        project.Should().NotBeNull();
        project.Title.Should().Be(title);
        project.Description.Should().Be(description);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Create_InvalidTitle_ShouldThrowException(string invalidTitle)
    {
        // Act & Assert
        var action = () => Project.Create(invalidTitle);

        action.Should().Throw<ArgumentException>()
            .WithMessage("*title*");
    }
}
```

### 2. FluentAssertions - Expressívebb Tesztek

```csharp
using FluentAssertions;

namespace JoineryTech.Flow.Core.Tests.Entities;

public class ProjectFluentTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreateProjectWithCorrectProperties()
    {
        // Arrange
        var title = "My Project";
        var description = "A test project";

        // Act
        var project = Project.Create(title, description);

        // Assert - FluentAssertions
        project.Should()
            .NotBeNull()
            .And.HaveProperty(p => p.Title).Equal(title)
            .And.HaveProperty(p => p.Description).Equal(description)
            .And.HaveProperty(p => p.Id).NotBe(Guid.Empty);
    }

    [Fact]
    public void Create_ShouldThrowArgumentException_WhenTitleIsEmpty()
    {
        // Act
        var action = () => Project.Create("");

        // Assert
        action.Should()
            .Throw<ArgumentException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void GetProjects_ShouldReturnOrderedList()
    {
        // Arrange
        var projects = new List<Project>
        {
            Project.Create("Z Project"),
            Project.Create("A Project"),
            Project.Create("M Project"),
        };

        // Act
        var sorted = projects.OrderBy(p => p.Title).ToList();

        // Assert
        sorted.Should()
            .HaveCount(3)
            .And.ContainInOrder(
                projects[1],  // A Project
                projects[2],  // M Project
                projects[0]   // Z Project
            );
    }
}
```

---

## ??? Integration Test Mintázat

### In-Memory SQLite Test Database

**Fájl**: `tests/JoineryTech.Flow.Infra.Tests/TestHelpers/SqliteTestDbFactory.cs`

```csharp
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using JoineryTech.Flow.Infra.Persistence;

namespace JoineryTech.Flow.Infra.Tests.TestHelpers;

/// <summary>
/// In-memory SQLite test DB factory
/// Migráció automatikusan alkalmazódik
/// </summary>
public static class SqliteTestDbFactory
{
    public static (AppDbContext Context, SqliteConnection Connection) CreateInMemoryContext()
    {
        // DataSource=:memory: - in-memory SQLite DB
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new AppDbContext(options);

        // Alkalmazz összes migration-t
        context.Database.Migrate();

        return (context, connection);
    }
}
```

**Felhasználás:**

```csharp
[Fact]
public async Task MyIntegrationTest_WithRealDb()
{
    // Arrange - create in-memory DB
    var (context, connection) = SqliteTestDbFactory.CreateInMemoryContext();

    // Try block - ensure cleanup
    try
    {
        // Tesztelés
        // ...
    }
    finally
    {
        // Cleanup
        context?.Dispose();
        connection?.Dispose();
    }
}
```

### Repository Integration Tesztek

**Fájl**: `tests/JoineryTech.Flow.Infra.Tests/Repository/ProjectRepositoryTests.cs`

```csharp
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using JoineryTech.Flow.Infra.Persistence.Repositories;
using JoineryTech.Flow.Core.Entities;
using JoineryTech.Flow.Infra.Tests.TestHelpers;

namespace JoineryTech.Flow.Infra.Tests.Repository;

public class ProjectRepositoryTests
{
    [Fact]
    public async Task Migrations_Are_Applied_To_Database()
    {
        // Arrange
        var (context, connection) = SqliteTestDbFactory.CreateInMemoryContext();

        using (context)
        using (connection)
        {
            // Act - Check applied migrations
            var applied = context.Database.GetAppliedMigrations().ToList();

            // Assert
            Assert.NotNull(applied);
            Assert.NotEmpty(applied);
        }
    }

    [Fact]
    public async Task Project_CRUD_Works_Via_EfRepository()
    {
        // Arrange
        var (context, connection) = SqliteTestDbFactory.CreateInMemoryContext();
        using var _ = context;
        using var __ = connection;

        var repo = new EfProjectRepository(context);
        var project = Project.Create("Test Project", "Desc");

        // Act - CREATE
        await repo.AddAsync(project);
        var list = await repo.ListAsync();

        // Assert - CREATE
        Assert.Single(list, p => p.Title == "Test Project");

        // Act - UPDATE
        project.UpdateDetails("Updated Title", "Desc 2", null);
        await repo.UpdateAsync(project);

        // Act - READ
        var fromDb = await repo.GetByIdAsync(project.Id);

        // Assert - UPDATE & READ
        Assert.NotNull(fromDb);
        Assert.Equal("Updated Title", fromDb!.Title);
    }

    [Fact]
    public async Task IsTitleUnique_Returns_False_When_Duplicate()
    {
        // Arrange
        var (context, connection) = SqliteTestDbFactory.CreateInMemoryContext();
        using var _ = context;
        using var __ = connection;

        var repo = new EfProjectRepository(context);
        var project = Project.Create("UniqueTitle");
        await repo.AddAsync(project);

        // Act & Assert
        var isUnique = await repo.IsTitleUniqueAsync("UniqueTitle");
        Assert.False(isUnique);  // Should exist - not unique

        var isUniqueDifferent = await repo.IsTitleUniqueAsync("OtherTitle");
        Assert.True(isUniqueDifferent);  // Doesn't exist - is unique
    }

    [Theory]
    [InlineData("Project1")]
    [InlineData("Project2")]
    [InlineData("Project3")]
    public async Task Add_MultipleProjects_StoredCorrectly(string projectTitle)
    {
        // Arrange
        var (context, connection) = SqliteTestDbFactory.CreateInMemoryContext();
        using var _ = context;
        using var __ = connection;

        var repo = new EfProjectRepository(context);
        var project = Project.Create(projectTitle);

        // Act
        await repo.AddAsync(project);
        var result = await repo.GetByIdAsync(project.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(projectTitle, result!.Title);
    }
}
```

---

## ?? Test Naming Konvenciók

### Naming Pattern

```
[MethodName]_[Scenario]_[ExpectedResult]
```

**Példák:**

| Test Neve | Leírás |
|-----------|--------|
| `Create_ValidTitle_ReturnsProject` | Method: Create, Scenario: ValidTitle, Result: ReturnsProject |
| `UpdateDetails_EmptyTitle_ThrowsException` | Method: UpdateDetails, Scenario: EmptyTitle, Result: ThrowsException |
| `Delete_NonExistentId_ReturnsFalse` | Method: Delete, Scenario: NonExistentId, Result: ReturnsFalse |
| `List_WithFilter_ReturnsFilteredResults` | Method: List, Scenario: WithFilter, Result: ReturnsFilteredResults |

### Alternative: Given-When-Then (BDD style)

```csharp
[Fact]
public void Given_ProjectExists_When_UpdateDetails_Then_ProjectIsUpdated()
{
    // Arrange - Given
    var project = Project.Create("Original");

    // Act - When
    project.UpdateDetails("Updated", "", null);

    // Assert - Then
    Assert.Equal("Updated", project.Title);
}
```

---

## ?? Test Statisztikák

| Metrika | Érték |
|---------|-------|
| **Test Framework** | xUnit |
| **Assertion Library** | FluentAssertions |
| **Test DB** | SQLite in-memory |
| **Coverage Tool** | coverlet |
| **Target Framework** | .NET 10.0 |

---

## ??? Build / Run Parancsok

### Unit Tesztek futtatása

```bash
# Összes test
dotnet test

# Konkrét projekt
dotnet test JoineryTech.Flow.Core.Tests

# Konkrét test class
dotnet test --filter "ClassName=ProjectRepositoryTests"

# Konkrét test method
dotnet test --filter "ClassName=ProjectRepositoryTests and MethodName=CRUD_Works_Via_EfRepository"

# Verbose output
dotnet test -v normal

# Watch mode (CI/CD-hez nincs, dev csak)
# (Manuálisan: edit › Ctrl+S › ismét futtat)
```

### Coverage Report Generálása

```bash
# .NET 10-ben:
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover

# HTML report
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover /p:CoverageReportFormat=html
```

### GitHub Actions CI (Example)

```yaml
name: .NET Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '10.0.x'
      - run: dotnet test --verbosity normal
```

---

## ?? Gyakori Hibák

| Hiba | Oka | Megoldás |
|------|-----|----------|
| `"No migrations to apply"` | Migráció még nem készült | `dotnet ef migrations add InitialCreate` a Infra projektben |
| `SqliteConnection not open` | DB connection hiányzik | `connection.Open()` hívása SqliteTestDbFactory-ban |
| `Timeout on async test` | Test nem vár aszinkron kódra | `await Task.WhenAll()` vagy `async Task` szignó |
| `Test fails only in CI` | Parallel test execution race condition | `[Collection]` attribute a test class-on |
| `DbContext disposed exception` | Using block körül | `using (context) { ... }` vagy try-finally |

---

## ?? Best Practices

### ? DO

- ? **AAA Pattern**: Arrange-Act-Assert szemléletes strukturálás
- ? **One assertion per test** (vagy cohesive assertions)
- ? **Descriptive names**: `Create_ValidTitle_ReturnsProject` ‹ jó
- ? **Test edge cases**: null, empty string, boundary values
- ? **Use [Theory] with [InlineData]**: Parameterized tests több esetre
- ? **FluentAssertions**: Expressz assert messages (`Should().Be()`)
- ? **In-memory DB**: Integration testekhez (no external deps)

### ? DON'T

- ? Hardcoded magic numbers: `Assert.Equal(42, result);` › use constants
- ? Test interdependencies: Egy test nem függhet más test output-ján
- ? `Thread.Sleep()`: Timeoutok helyett - Use `WaitFor()` + polling
- ? Console.WriteLine() debugging: Logger vagy debugger használjon
- ? Async void test methods: `[Fact] async void` - ? Helyesen: `[Fact] async Task`

---

## ?? Referenciák

- **Test Framework**: [xUnit.net Documentation](https://xunit.net/)
- **Assertions**: [FluentAssertions](https://fluentassertions.com/)
- **Entity Framework Testing**: [Microsoft EF Core Test Documentation](https://learn.microsoft.com/en-us/ef/core/miscellaneous/testing/)
- **Repository**: `tests/JoineryTech.Flow.Infra.Tests/`

---

**Utolsó frissítés**: 2026-02-01
