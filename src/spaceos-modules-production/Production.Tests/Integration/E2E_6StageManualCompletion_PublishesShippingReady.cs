using FluentAssertions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using SpaceOS.Modules.Production.Domain.ProductionJobs.Events;
using Xunit;

namespace Production.Tests.Integration;

/// <summary>
/// E2E Test: Completing all 6 workflow steps should publish ProductionJobShippingReady event.
/// </summary>
public class E2E_6StageManualCompletion_PublishesShippingReady : ProductionTestBase
{
    [Fact]
    public async Task Given_ProductionJob_When_All6StepsCompleted_Then_ShouldPublishShippingReadyEvent()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId, projectName: "TEST-789").ConfigureAwait(false);

        // Act - Complete all 6 steps sequentially
        await CompleteAllSteps(productionJob.Id.Value).ConfigureAwait(false);

        // Assert - Retrieve updated job
        var updatedJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);

        updatedJob.Should().NotBeNull();
        updatedJob!.Status.Should().Be(ProductionStatus.ShippingReady);

        // Verify all steps are Done
        updatedJob.Steps.Should().HaveCount(6);
        updatedJob.Steps.Should().AllSatisfy(step =>
        {
            step.Status.Should().Be(WorkflowStepStatus.Done);
            step.CompletedAt.Should().NotBeNull();
            step.CompletedBy.Should().NotBeNullOrEmpty();
        });

        // Verify domain events (1 ProductionJobStarted + 6 WorkflowStepStarted + 6 WorkflowStepCompleted + 1 ProductionJobShippingReady)
        updatedJob.DomainEvents.Should().Contain(e => e is ProductionJobShippingReady);

        var shippingReadyEvent = updatedJob.DomainEvents.OfType<ProductionJobShippingReady>().FirstOrDefault();
        shippingReadyEvent.Should().NotBeNull();
        shippingReadyEvent!.JobId.Should().Be(updatedJob.Id);
    }

    [Fact]
    public async Task Given_ProductionJob_When_Only5StepsCompleted_Then_ShouldNotPublishShippingReadyEvent()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId).ConfigureAwait(false);

        // Act - Complete only first 5 steps (skip last step)
        var stepsToComplete = new[]
        {
            WorkflowStepName.SzabaszatElőgyártás,
            WorkflowStepName.Megmunkálás,
            WorkflowStepName.Felületkezelés,
            WorkflowStepName.Összeszerelés,
            WorkflowStepName.Csomagolás
        };

        foreach (var stepName in stepsToComplete)
        {
            await StartStep(productionJob.Id.Value, stepName).ConfigureAwait(false);

            var photoUrl = stepName == WorkflowStepName.Összeszerelés ? "https://example.com/photo.jpg" : null;
            await CompleteStep(productionJob.Id.Value, stepName, photoUrl).ConfigureAwait(false);
        }

        // Assert
        var updatedJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);

        updatedJob!.Status.Should().Be(ProductionStatus.InProgress); // NOT ShippingReady
        updatedJob.Steps[5].Status.Should().Be(WorkflowStepStatus.Pending); // Last step still pending

        // Verify ShippingReady event was NOT published
        updatedJob.DomainEvents.Should().NotContain(e => e is ProductionJobShippingReady);
    }

    [Fact]
    public async Task Given_ÖsszeszerelésStep_When_CompletedWithoutPhoto_Then_ShouldFail()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId).ConfigureAwait(false);

        // Complete first 3 steps
        await CompleteAllStepsUpTo(productionJob.Id.Value, WorkflowStepName.Összeszerelés).ConfigureAwait(false);

        // Act - Try to complete Összeszerelés WITHOUT photo
        var job = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);
        await StartStep(job!.Id.Value, WorkflowStepName.Összeszerelés).ConfigureAwait(false);

        job = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);
        var result = job!.CompleteStep(WorkflowStepName.Összeszerelés, photoUrl: null, completedBy: "test-user");

        // Assert - Should fail because Összeszerelés requires photo
        result.IsFailure.Should().BeTrue();
        result.Error.Should().ContainEquivalentOf("photo", because: "Összeszerelés step requires photo upload");
    }

    /// <summary>
    /// Helper method: Complete all steps up to (but not including) the specified step.
    /// </summary>
    private async Task CompleteAllStepsUpTo(Guid jobId, WorkflowStepName targetStep)
    {
        var allSteps = new[]
        {
            WorkflowStepName.SzabaszatElőgyártás,
            WorkflowStepName.Megmunkálás,
            WorkflowStepName.Felületkezelés,
            WorkflowStepName.Összeszerelés,
            WorkflowStepName.Csomagolás,
            WorkflowStepName.KiszállításraMegjelölés
        };

        foreach (var stepName in allSteps)
        {
            if (stepName == targetStep)
                break;

            await StartStep(jobId, stepName).ConfigureAwait(false);

            var photoUrl = stepName == WorkflowStepName.Összeszerelés ? "https://example.com/photo.jpg" : null;
            await CompleteStep(jobId, stepName, photoUrl).ConfigureAwait(false);
        }
    }
}
