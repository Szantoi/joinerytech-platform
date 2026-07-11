using SpaceOS.Modules.Contracts.Maintenance.Events;
using SpaceOS.Modules.Production.Application.EventHandlers;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using Xunit;

using WorkflowStepName = SpaceOS.Modules.Production.Domain.ProductionJobs.WorkflowStepName;

namespace Production.Tests.Integration.CrossModule;

/// <summary>
/// Integration test: Maintenance module AssetDowntimeEvent → Production module reschedules/pauses jobs
/// Validates cross-module event propagation (Maintenance → Production)
/// </summary>
public class Maintenance_AssetDowntime_ImpactsProduction : ProductionTestBase
{
    [Fact]
    public async Task AssetDowntime_PausesInProgressJob()
    {
        // Arrange
        var assetId = Guid.NewGuid();
        var job = ProductionJob.Create(
            orderId: Guid.NewGuid(),
            customerId: Guid.NewGuid(),
            projectName: "Test Order",
            deadline: DateTimeOffset.UtcNow.AddDays(7)
        );
        job.AssignAsset(assetId);

        // Start first step to move to InProgress
        job.StartStep(WorkflowStepName.SzabaszatElőgyártás);

        await _repository.AddAsync(job).ConfigureAwait(false);
        await _repository.SaveChangesAsync().ConfigureAwait(false);

        // Create AssetDowntimeEvent (from Maintenance module)
        var downtimeEvent = new AssetDowntimeEvent
        {
            TenantId = Guid.NewGuid(),
            AssetId = assetId,
            AssetName = "CNC Machine 1",
            Reason = "Maintenance",
            EstimatedFixDate = DateTimeOffset.UtcNow.AddDays(2),
            OccurredAt = DateTimeOffset.UtcNow
        };

        var handler = new AssetDowntimeEventHandler(_repository);

        // Act
        await handler.Handle(downtimeEvent, CancellationToken.None).ConfigureAwait(false);

        // Assert
        var updatedJob = await _repository.GetByIdAsync(job.Id).ConfigureAwait(false);
        Assert.NotNull(updatedJob);
        Assert.Equal(ProductionStatus.InProgress, updatedJob.Status);
        Assert.Contains("unavailable", updatedJob.StatusReason, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CNC Machine 1", updatedJob.StatusReason);
    }

    [Fact]
    public async Task AssetDowntime_ReschedulesQueuedJob()
    {
        // Arrange
        var assetId = Guid.NewGuid();
        var originalDeadline = DateTimeOffset.UtcNow.AddDays(7);
        var job = ProductionJob.Create(
            orderId: Guid.NewGuid(),
            customerId: Guid.NewGuid(),
            projectName: "Test Order 2",
            deadline: originalDeadline
        );
        job.AssignAsset(assetId);

        await _repository.AddAsync(job).ConfigureAwait(false);
        await _repository.SaveChangesAsync().ConfigureAwait(false);

        // Create AssetDowntimeEvent with estimated fix date
        var newDeadline = DateTimeOffset.UtcNow.AddDays(10);
        var downtimeEvent = new AssetDowntimeEvent
        {
            TenantId = Guid.NewGuid(),
            AssetId = assetId,
            AssetName = "Assembly Station 2",
            Reason = "Breakdown",
            EstimatedFixDate = newDeadline,
            OccurredAt = DateTimeOffset.UtcNow
        };

        var handler = new AssetDowntimeEventHandler(_repository);

        // Act
        await handler.Handle(downtimeEvent, CancellationToken.None).ConfigureAwait(false);

        // Assert
        var updatedJob = await _repository.GetByIdAsync(job.Id).ConfigureAwait(false);
        Assert.NotNull(updatedJob);
        Assert.Equal(ProductionStatus.Queued, updatedJob.Status);
        Assert.True(updatedJob.Deadline >= newDeadline);
        Assert.Contains("Rescheduled", updatedJob.StatusReason ?? "");
    }

    [Fact]
    public async Task AssetDowntime_NoJobsAffected_NoError()
    {
        // Arrange
        var nonExistentAssetId = Guid.NewGuid();
        var downtimeEvent = new AssetDowntimeEvent
        {
            TenantId = Guid.NewGuid(),
            AssetId = nonExistentAssetId,
            AssetName = "Ghost Machine",
            Reason = "Does not exist",
            EstimatedFixDate = null,
            OccurredAt = DateTimeOffset.UtcNow
        };

        var handler = new AssetDowntimeEventHandler(_repository);

        // Act & Assert (should not throw)
        await handler.Handle(downtimeEvent, CancellationToken.None).ConfigureAwait(false);
    }
}
