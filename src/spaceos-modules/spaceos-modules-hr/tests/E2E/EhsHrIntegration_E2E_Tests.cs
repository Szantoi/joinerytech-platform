using FluentAssertions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.HR.Application.Contracts;
using SpaceOS.Modules.HR.Application.EventHandlers;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Infrastructure.Data;
using SpaceOS.Modules.HR.Infrastructure.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.E2E;

/// <summary>
/// E2E tests for EHS → HR integration.
/// Simulates full training completion flow from EHS module to HR Employee competency update.
/// </summary>
public class EhsHrIntegration_E2E_Tests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("spaceos_hr_e2e_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    private HrDbContext _context = null!;
    private IEmployeeRepository _repository = null!;
    private IMediator _mediator = null!;
    private IServiceProvider _serviceProvider = null!;
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

        // Setup full service provider (simulates application startup)
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(_context);
        services.AddSingleton<IEmployeeRepository>(_repository);
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(TrainingCompletedEventHandler).Assembly);
        });

        _serviceProvider = services.BuildServiceProvider();
        _mediator = _serviceProvider.GetRequiredService<IMediator>();
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task TrainingCompletion_FullFlow_UpdatesEmployeeCompetency()
    {
        // Arrange: Create Employee in HR module
        var employeeId = Guid.NewGuid();
        var employee = new Employee(
            id: employeeId,
            tenantId: _tenantId,
            fullName: "Bob Wilson",
            email: "bob.wilson@example.com",
            hireDate: DateTime.UtcNow.AddYears(-2),
            department: "Operations",
            jobTitle: "Operator"
        );
        await _repository.AddAsync(employee, CancellationToken.None);

        // Act: Simulate EHS training completion event (via MediatR)
        var trainingTypeId = Guid.NewGuid();
        var trainingEvent = new TrainingCompletedEvent(
            EmployeeId: employeeId,
            TrainingTypeId: trainingTypeId,
            TrainingName: "SAFETY_TRAINING_2026",
            CertificationLevel: "Level 5",
            CompletionDate: DateTime.UtcNow,
            CertificationExpiry: DateTime.UtcNow.AddYears(1)
        );

        await _mediator.Publish(trainingEvent, CancellationToken.None);

        // Assert: Verify competency added to Employee
        var updated = await _repository.GetByIdAsync(employeeId, CancellationToken.None);
        updated.Should().NotBeNull();
        updated!.Competencies.Should().HaveCount(1);

        var competency = updated.Competencies.First();
        competency.CompetencyId.Should().Be(trainingTypeId);
        competency.CompetencyName.Should().Be("SAFETY_TRAINING_2026");
        competency.Level.Should().Be("Level 5");
        competency.ValidFrom.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        competency.ValidUntil.Should().NotBeNull();

        // Verify expiry is approximately 1 year from now
        var expiryDays = (competency.ValidUntil!.Value - DateTime.UtcNow).TotalDays;
        expiryDays.Should().BeInRange(360, 370); // ~365 days ± 5 days
    }

    [Fact]
    public async Task TrainingCompletion_MultipleEvents_AccumulatesCompetencies()
    {
        // Arrange: Create Employee in HR module
        var employeeId = Guid.NewGuid();
        var employee = new Employee(
            id: employeeId,
            tenantId: _tenantId,
            fullName: "Alice Brown",
            email: "alice.brown@example.com",
            hireDate: DateTime.UtcNow.AddYears(-5),
            department: "Safety",
            jobTitle: "Supervisor"
        );
        await _repository.AddAsync(employee, CancellationToken.None);

        // Act: Simulate 3 training completions from EHS module
        var trainings = new[]
        {
            new TrainingCompletedEvent(
                EmployeeId: employeeId,
                TrainingTypeId: Guid.NewGuid(),
                TrainingName: "FIRST_AID",
                CertificationLevel: "Level 3",
                CompletionDate: DateTime.UtcNow,
                CertificationExpiry: DateTime.UtcNow.AddYears(2)
            ),
            new TrainingCompletedEvent(
                EmployeeId: employeeId,
                TrainingTypeId: Guid.NewGuid(),
                TrainingName: "FIRE_SAFETY",
                CertificationLevel: "Level 4",
                CompletionDate: DateTime.UtcNow.AddDays(1),
                CertificationExpiry: DateTime.UtcNow.AddYears(3)
            ),
            new TrainingCompletedEvent(
                EmployeeId: employeeId,
                TrainingTypeId: Guid.NewGuid(),
                TrainingName: "HAZMAT_HANDLING",
                CertificationLevel: "Level 5",
                CompletionDate: DateTime.UtcNow.AddDays(2),
                CertificationExpiry: null // No expiry
            )
        };

        foreach (var training in trainings)
        {
            await _mediator.Publish(training, CancellationToken.None);
        }

        // Assert: Verify all 3 competencies accumulated
        var updated = await _repository.GetByIdAsync(employeeId, CancellationToken.None);
        updated.Should().NotBeNull();
        updated!.Competencies.Should().HaveCount(3);

        // Verify all competencies are present
        var competencyNames = updated.Competencies.Select(c => c.CompetencyName).ToList();
        competencyNames.Should().Contain("FIRST_AID");
        competencyNames.Should().Contain("FIRE_SAFETY");
        competencyNames.Should().Contain("HAZMAT_HANDLING");

        // Verify levels
        updated.Competencies.First(c => c.CompetencyName == "FIRST_AID").Level.Should().Be("Level 3");
        updated.Competencies.First(c => c.CompetencyName == "FIRE_SAFETY").Level.Should().Be("Level 4");
        updated.Competencies.First(c => c.CompetencyName == "HAZMAT_HANDLING").Level.Should().Be("Level 5");

        // Verify HAZMAT has no expiry
        updated.Competencies.First(c => c.CompetencyName == "HAZMAT_HANDLING").ValidUntil.Should().BeNull();
    }
}
