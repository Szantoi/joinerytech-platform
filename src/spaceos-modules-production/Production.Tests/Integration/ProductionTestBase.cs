using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;
using SpaceOS.Modules.Production.Domain.Abstractions;
using SpaceOS.Modules.Production.Infrastructure.Persistence;
using SpaceOS.Modules.Production.Infrastructure.Persistence.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace Production.Tests.Integration;

/// <summary>
/// Base class for Production module integration tests.
/// Provides Testcontainers PostgreSQL setup and test infrastructure.
/// </summary>
public class ProductionTestBase : IAsyncLifetime
{
    protected readonly PostgreSqlContainer _postgresContainer;
    protected IProductionJobRepository _repository = null!;
    protected ProductionDbContext _dbContext = null!;

    public ProductionTestBase()
    {
        _postgresContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("production_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();
    }

    public async Task InitializeAsync()
    {
        // Start PostgreSQL container
        await _postgresContainer.StartAsync().ConfigureAwait(false);

        // Setup DbContext
        var connectionString = _postgresContainer.GetConnectionString();
        var optionsBuilder = new DbContextOptionsBuilder<ProductionDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        _dbContext = new ProductionDbContext(optionsBuilder.Options);

        // Create database schema
        await _dbContext.Database.EnsureCreatedAsync().ConfigureAwait(false);

        // Setup repository
        _repository = new ProductionJobRepository(_dbContext);
    }

    public async Task DisposeAsync()
    {
        if (_dbContext != null)
        {
            await _dbContext.DisposeAsync().ConfigureAwait(false);
        }

        await _postgresContainer.DisposeAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Simulates event processing delay (500ms by default).
    /// </summary>
    protected async Task WaitForEventProcessing(int milliseconds = 500)
    {
        await Task.Delay(milliseconds).ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a test ProductionJob with default 6-stage workflow.
    /// </summary>
    protected async Task<ProductionJob> CreateTestProductionJob(
        Guid orderId,
        Guid? customerId = null,
        string projectName = "TEST-PROJECT",
        CancellationToken ct = default)
    {
        var job = ProductionJob.Create(
            orderId: orderId,
            customerId: customerId ?? Guid.NewGuid(),
            projectName: projectName,
            deadline: DateTimeOffset.UtcNow.AddDays(30)
        );

        await _repository.AddAsync(job, ct).ConfigureAwait(false);
        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

        return job;
    }

    /// <summary>
    /// Manually completes a workflow step (simulates manual completion via API).
    /// </summary>
    protected async Task CompleteStep(
        Guid jobId,
        WorkflowStepName stepName,
        string? photoUrl = null,
        CancellationToken ct = default)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct).ConfigureAwait(false);
        if (job == null)
            throw new InvalidOperationException($"ProductionJob {jobId} not found");

        job.CompleteStep(stepName, photoUrl: photoUrl, completedBy: "test-user");

        await _repository.UpdateAsync(job, ct).ConfigureAwait(false);
        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Starts a workflow step (simulates step start via API).
    /// </summary>
    protected async Task StartStep(
        Guid jobId,
        WorkflowStepName stepName,
        CancellationToken ct = default)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct).ConfigureAwait(false);
        if (job == null)
            throw new InvalidOperationException($"ProductionJob {jobId} not found");

        job.StartStep(stepName);

        await _repository.UpdateAsync(job, ct).ConfigureAwait(false);
        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Auto-completes a workflow step (simulates event-driven completion, e.g., CuttingCompleted).
    /// </summary>
    protected async Task AutoCompleteStep(
        Guid jobId,
        WorkflowStepName stepName,
        string completedBy = "auto:system",
        CancellationToken ct = default)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct).ConfigureAwait(false);
        if (job == null)
            throw new InvalidOperationException($"ProductionJob {jobId} not found");

        job.AutoCompleteStep(stepName, completedBy);

        await _repository.UpdateAsync(job, ct).ConfigureAwait(false);
        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Completes all 6 workflow steps sequentially.
    /// </summary>
    protected async Task CompleteAllSteps(Guid jobId, CancellationToken ct = default)
    {
        var stepNames = new[]
        {
            WorkflowStepName.SzabaszatElőgyártás,
            WorkflowStepName.Megmunkálás,
            WorkflowStepName.Felületkezelés,
            WorkflowStepName.Összeszerelés,
            WorkflowStepName.Csomagolás,
            WorkflowStepName.KiszállításraMegjelölés
        };

        foreach (var stepName in stepNames)
        {
            await StartStep(jobId, stepName, ct).ConfigureAwait(false);

            // Összeszerelés requires photo
            var photoUrl = stepName == WorkflowStepName.Összeszerelés ? "https://example.com/photo.jpg" : null;

            await CompleteStep(jobId, stepName, photoUrl, ct).ConfigureAwait(false);
        }
    }
}
