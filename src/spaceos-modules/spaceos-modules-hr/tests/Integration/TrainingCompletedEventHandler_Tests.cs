using FluentAssertions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.HR.Application.Contracts;
using SpaceOS.Modules.HR.Application.EventHandlers;
using SpaceOS.Modules.HR.Application.Exceptions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Infrastructure.Data;
using SpaceOS.Modules.HR.Infrastructure.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Integration;

/// <summary>
/// Integration tests for TrainingCompletedEventHandler.
/// Tests EHS→HR cross-module integration via MediatR events.
/// </summary>
public class TrainingCompletedEventHandler_Tests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("spaceos_hr_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    private HrDbContext _context = null!;
    private IEmployeeRepository _repository = null!;
    private IMediator _mediator = null!;
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

        // Setup MediatR with event handler
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(_context);
        services.AddSingleton<IEmployeeRepository>(_repository);
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(TrainingCompletedEventHandler).Assembly);
        });

        var serviceProvider = services.BuildServiceProvider();
        _mediator = serviceProvider.GetRequiredService<IMediator>();
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task Handle_ValidEvent_AddsCompetencyToEmployee()
    {
        // Arrange
        var employeeId = Guid.NewGuid();
        var employee = new Employee(
            id: employeeId,
            tenantId: _tenantId,
            fullName: "John Doe",
            email: "john.doe@example.com",
            hireDate: DateTime.UtcNow,
            department: "Engineering",
            jobTitle: "Welder"
        );
        await _repository.AddAsync(employee, CancellationToken.None);

        var trainingTypeId = Guid.NewGuid();
        var eventData = new TrainingCompletedEvent(
            EmployeeId: employeeId,
            TrainingTypeId: trainingTypeId,
            TrainingName: "WELDING_CERT",
            CertificationLevel: "Level 3",
            CompletionDate: DateTime.UtcNow,
            CertificationExpiry: DateTime.UtcNow.AddYears(3)
        );

        // Act
        await _mediator.Publish(eventData, CancellationToken.None);

        // Assert
        var updated = await _repository.GetByIdAsync(employeeId, CancellationToken.None);
        updated.Should().NotBeNull();
        updated!.Competencies.Should().HaveCount(1);

        var competency = updated.Competencies.First();
        competency.CompetencyId.Should().Be(trainingTypeId);
        competency.CompetencyName.Should().Be("WELDING_CERT");
        competency.Level.Should().Be("Level 3");
        competency.ValidFrom.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        competency.ValidUntil.Should().NotBeNull();
        competency.ValidUntil!.Value.Should().BeCloseTo(DateTime.UtcNow.AddYears(3), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Handle_EmployeeNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var nonExistentEmployeeId = Guid.NewGuid();
        var eventData = new TrainingCompletedEvent(
            EmployeeId: nonExistentEmployeeId,
            TrainingTypeId: Guid.NewGuid(),
            TrainingName: "SAFETY_CERT",
            CertificationLevel: "Level 5",
            CompletionDate: DateTime.UtcNow,
            CertificationExpiry: null
        );

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(async () =>
        {
            await _mediator.Publish(eventData, CancellationToken.None);
        });
    }

    [Fact]
    public async Task Handle_DuplicateCompetency_UpdatesExisting()
    {
        // Arrange
        var employeeId = Guid.NewGuid();
        var employee = new Employee(
            id: employeeId,
            tenantId: _tenantId,
            fullName: "Jane Smith",
            email: "jane.smith@example.com",
            hireDate: DateTime.UtcNow,
            department: "Operations",
            jobTitle: "Technician"
        );

        var competencyId = Guid.NewGuid();
        employee.AddCompetency(
            competencyId: competencyId,
            competencyName: "FORKLIFT_CERT",
            level: "Level 2",
            validFrom: DateTime.UtcNow.AddMonths(-6),
            validUntil: null
        );

        await _repository.AddAsync(employee, CancellationToken.None);

        // Act - Send event with same competency but upgraded level
        var eventData = new TrainingCompletedEvent(
            EmployeeId: employeeId,
            TrainingTypeId: competencyId, // Same competency ID
            TrainingName: "FORKLIFT_CERT",
            CertificationLevel: "Level 4", // Upgraded from Level 2
            CompletionDate: DateTime.UtcNow,
            CertificationExpiry: null
        );

        await _mediator.Publish(eventData, CancellationToken.None);

        // Assert
        var updated = await _repository.GetByIdAsync(employeeId, CancellationToken.None);
        updated.Should().NotBeNull();
        updated!.Competencies.Should().HaveCount(1); // Still only 1 competency

        var competency = updated.Competencies.First();
        competency.CompetencyId.Should().Be(competencyId);
        competency.Level.Should().Be("Level 4"); // Upgraded level
        competency.CompetencyName.Should().Be("FORKLIFT_CERT");
    }
}
