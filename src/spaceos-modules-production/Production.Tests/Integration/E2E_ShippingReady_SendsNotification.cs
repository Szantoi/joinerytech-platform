using FluentAssertions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using Production.Tests.Mocks;
using Xunit;

namespace Production.Tests.Integration;

/// <summary>
/// E2E Test: ProductionJobShippingReady event should trigger notification to owner/sales.
///
/// NOTE: Notification infrastructure (ProductionEventPublisher, Telegram/email integration)
/// is not yet implemented. This test is currently SKIPPED.
/// </summary>
public class E2E_ShippingReady_SendsNotification : ProductionTestBase
{
    [Fact(Skip = "Notification infrastructure not yet implemented (ProductionEventPublisher)")]
    public async Task Given_AllStepsCompleted_When_ShippingReady_Then_ShouldSendNotification()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId, projectName: "TEST-999").ConfigureAwait(false);
        var notificationSpy = new NotificationSpy();

        // Act - Complete all steps
        await CompleteAllSteps(productionJob.Id.Value).ConfigureAwait(false);

        // TODO: Implement ProductionEventPublisher to send notifications
        // await WaitForEventProcessing(); // Wait for async event handling

        // Assert - Verify notification was sent
        // NOTE: This will work once ProductionEventPublisher is implemented
        notificationSpy.SentNotifications.Should().ContainSingle();

        var notification = notificationSpy.SentNotifications.First();
        notification.Message.Should().Contain("kiszállítható");
        notification.Message.Should().Contain(productionJob.ProjectName);
    }

    [Fact]
    public async Task Given_ProductionJobShippingReady_When_Retrieved_Then_ShouldHaveCorrectStatus()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId, projectName: "DSMR 26144").ConfigureAwait(false);

        // Act
        await CompleteAllSteps(productionJob.Id.Value).ConfigureAwait(false);

        // Assert
        var retrievedJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);

        retrievedJob.Should().NotBeNull();
        retrievedJob!.Status.Should().Be(ProductionStatus.ShippingReady);
        retrievedJob.Steps.Should().AllSatisfy(step => step.Status.Should().Be(WorkflowStepStatus.Done));
    }

    [Fact]
    public async Task Given_ProductionJob_When_6thStepCompleted_Then_StatusShouldBecomeShippingReady()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var productionJob = await CreateTestProductionJob(orderId).ConfigureAwait(false);

        // Act - Complete first 5 steps
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

        // Status should still be InProgress
        var jobAfter5Steps = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);
        jobAfter5Steps!.Status.Should().Be(ProductionStatus.InProgress);

        // Now complete the 6th step (Kiszállítható)
        await StartStep(productionJob.Id.Value, WorkflowStepName.KiszállításraMegjelölés).ConfigureAwait(false);
        await CompleteStep(productionJob.Id.Value, WorkflowStepName.KiszállításraMegjelölés).ConfigureAwait(false);

        // Assert - Status should transition to ShippingReady
        var finalJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);
        finalJob!.Status.Should().Be(ProductionStatus.ShippingReady);
    }
}
