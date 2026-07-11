using FluentAssertions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using Xunit;

namespace Production.Tests.Integration;

/// <summary>
/// E2E Test: CuttingCompleted event should auto-complete the "Szabászat/Előgyártás" step.
///
/// NOTE: Event handler (CuttingCompletedEventHandler) is not yet implemented.
/// This test simulates the auto-completion logic using AutoCompleteStep().
/// </summary>
public class E2E_CuttingCompleted_AutoCompletesSzabaszat : ProductionTestBase
{
    [Fact]
    public async Task Given_ProductionJobExists_When_CuttingCompleted_Then_SzabaszatStepShouldBeAutoCompleted()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId, projectName: "TEST-456").ConfigureAwait(false);

        // Act - Simulate CuttingCompletedEventHandler behavior
        await AutoCompleteStep(
            jobId: productionJob.Id.Value,
            stepName: WorkflowStepName.SzabaszatElőgyártás,
            completedBy: "auto:CuttingCompleted"
        ).ConfigureAwait(false);

        // Assert
        var updatedJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);

        updatedJob.Should().NotBeNull();

        var szabaszatStep = updatedJob!.Steps[0];
        szabaszatStep.Status.Should().Be(WorkflowStepStatus.Done);
        szabaszatStep.CompletedBy.Should().Be("auto:CuttingCompleted");
        szabaszatStep.CompletedAt.Should().NotBeNull();

        // Job status should transition from Queued → InProgress
        updatedJob.Status.Should().Be(ProductionStatus.InProgress);
    }

    [Fact]
    public async Task Given_SzabaszatCompleted_When_StartNextStep_Then_ShouldAllowMegmunkálás()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId).ConfigureAwait(false);

        // Auto-complete first step (Szabászat)
        await AutoCompleteStep(
            jobId: productionJob.Id.Value,
            stepName: WorkflowStepName.SzabaszatElőgyártás,
            completedBy: "auto:CuttingCompleted"
        ).ConfigureAwait(false);

        // Act - Start second step (Megmunkálás)
        await StartStep(
            jobId: productionJob.Id.Value,
            stepName: WorkflowStepName.Megmunkálás
        ).ConfigureAwait(false);

        // Assert
        var updatedJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);

        var megmunkálásStep = updatedJob!.Steps[1];
        megmunkálásStep.Status.Should().Be(WorkflowStepStatus.InProgress);
    }

    [Fact]
    public async Task Given_SzabaszatNotCompleted_When_StartMegmunkálás_Then_ShouldFail()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId).ConfigureAwait(false);

        // Act - Try to start second step WITHOUT completing first
        var job = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);
        var result = job!.StartStep(WorkflowStepName.Megmunkálás);

        // Assert - Should fail due to FSM rule (steps must be completed in order)
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Contain("must be completed first");
    }
}
