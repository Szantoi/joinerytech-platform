using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Infrastructure.Data;
using SpaceOS.Modules.HR.Infrastructure.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Integration;

/// <summary>
/// Integration tests for EmployeeRepository.
/// Tests CRUD operations against PostgreSQL via Testcontainers.
/// </summary>
public class EmployeeRepository_Tests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("spaceos_hr_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    private HrDbContext _context = null!;
    private EmployeeRepository _repository = null!;
    private readonly Guid _tenantId = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var options = new DbContextOptionsBuilder<HrDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        _context = new HrDbContext(options);
        await _context.Database.MigrateAsync();

        _repository = new EmployeeRepository(_context);
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task AddAsync_NewEmployee_CreatesInDatabase()
    {
        // Arrange
        var employee = new Employee(
            id: Guid.NewGuid(),
            tenantId: _tenantId,
            fullName: "John Doe",
            email: "john.doe@example.com",
            hireDate: DateTime.UtcNow,
            department: "Engineering",
            jobTitle: "Developer"
        );

        // Act
        await _repository.AddAsync(employee, CancellationToken.None);

        // Assert
        var saved = await _repository.GetByIdAsync(employee.Id, CancellationToken.None);
        saved.Should().NotBeNull();
        saved!.FullName.Should().Be("John Doe");
        saved.Email.Should().Be("john.doe@example.com");
        saved.Department.Should().Be("Engineering");
        saved.JobTitle.Should().Be("Developer");
    }

    [Fact]
    public async Task AddCompetency_UpdatesEmployee_PersistsCorrectly()
    {
        // Arrange
        var employeeId = Guid.NewGuid();
        var employee = new Employee(
            id: employeeId,
            tenantId: _tenantId,
            fullName: "Jane Smith",
            email: "jane.smith@example.com",
            hireDate: DateTime.UtcNow,
            department: "Engineering",
            jobTitle: "Engineer"
        );
        await _repository.AddAsync(employee, CancellationToken.None);

        // Act - Reload employee from database
        var loadedEmployee = await _repository.GetByIdAsync(employeeId, CancellationToken.None);
        loadedEmployee.Should().NotBeNull();

        var competencyId = Guid.NewGuid();
        loadedEmployee!.AddCompetency(
            competencyId: competencyId,
            competencyName: "WELDING_CERT",
            level: "Level 3",
            validFrom: DateTime.UtcNow,
            validUntil: DateTime.UtcNow.AddYears(3)
        );
        await _repository.SaveAsync(loadedEmployee, CancellationToken.None);

        // Assert - Reload and verify
        var updated = await _repository.GetByIdAsync(employeeId, CancellationToken.None);
        updated.Should().NotBeNull();
        updated!.Competencies.Should().HaveCount(1);

        var competency = updated.Competencies.First();
        competency.CompetencyId.Should().Be(competencyId);
        competency.CompetencyName.Should().Be("WELDING_CERT");
        competency.Level.Should().Be("Level 3");
    }

    [Fact]
    public async Task GetByIdAsync_WithCompetencies_LoadsFullAggregate()
    {
        // Arrange
        var employee = new Employee(
            id: Guid.NewGuid(),
            tenantId: _tenantId,
            fullName: "Mike Johnson",
            email: "mike.johnson@example.com",
            hireDate: DateTime.UtcNow,
            department: "Safety",
            jobTitle: "Supervisor"
        );

        employee.AddCompetency(
            competencyId: Guid.NewGuid(),
            competencyName: "SAFETY_CERT",
            level: "Level 5",
            validFrom: DateTime.UtcNow,
            validUntil: null
        );

        employee.AddCompetency(
            competencyId: Guid.NewGuid(),
            competencyName: "QUALITY_CERT",
            level: "Level 4",
            validFrom: DateTime.UtcNow,
            validUntil: DateTime.UtcNow.AddYears(2)
        );

        await _repository.AddAsync(employee, CancellationToken.None);

        // Act
        var loaded = await _repository.GetByIdAsync(employee.Id, CancellationToken.None);

        // Assert
        loaded.Should().NotBeNull();
        loaded!.Competencies.Should().HaveCount(2);
        loaded.Competencies.Select(c => c.CompetencyName).Should().Contain(new[] { "SAFETY_CERT", "QUALITY_CERT" });
    }

    [Fact]
    public async Task DeleteAsync_RemovesEmployee_AndCompetencies()
    {
        // Arrange
        var employee = new Employee(
            id: Guid.NewGuid(),
            tenantId: _tenantId,
            fullName: "Bob Wilson",
            email: "bob.wilson@example.com",
            hireDate: DateTime.UtcNow,
            department: "Operations",
            jobTitle: "Technician"
        );

        employee.AddCompetency(
            competencyId: Guid.NewGuid(),
            competencyName: "FORKLIFT_CERT",
            level: "Level 2",
            validFrom: DateTime.UtcNow,
            validUntil: null
        );

        await _repository.AddAsync(employee, CancellationToken.None);

        // Act
        await _repository.DeleteAsync(employee.Id, CancellationToken.None);

        // Assert
        var deleted = await _repository.GetByIdAsync(employee.Id, CancellationToken.None);
        deleted.Should().BeNull();
    }
}
