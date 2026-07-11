using FluentAssertions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using Xunit;

namespace Production.Tests.Integration;

/// <summary>
/// E2E Test: OrderConfirmed event should create a ProductionJob with 6 workflow steps.
///
/// NOTE: Event handler (OrderConfirmedEventHandler) is not yet implemented.
/// This test simulates the creation logic manually.
/// </summary>
public class E2E_OrderConfirmed_CreatesProductionJob : ProductionTestBase
{
    [Fact]
    public async Task Given_OrderConfirmed_When_ProductionJobCreated_Then_ShouldHave6Steps()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        const string projectName = "DSMR 26144";
        var deadline = DateTimeOffset.UtcNow.AddDays(30);

        // Act - Simulate OrderConfirmedEventHandler behavior
        var productionJob = ProductionJob.Create(
            orderId: orderId,
            customerId: customerId,
            projectName: projectName,
            deadline: deadline
        );

        await _repository.AddAsync(productionJob).ConfigureAwait(false);
        await _repository.SaveChangesAsync().ConfigureAwait(false);

        // Assert
        var retrievedJob = await _repository.GetByIdAsync(productionJob.Id).ConfigureAwait(false);

        retrievedJob.Should().NotBeNull();
        retrievedJob!.OrderId.Should().Be(orderId);
        retrievedJob.CustomerId.Should().Be(customerId);
        retrievedJob.ProjectName.Should().Be(projectName);
        retrievedJob.Status.Should().Be(ProductionStatus.Queued);

        // Verify 6 workflow steps
        retrievedJob.Steps.Should().HaveCount(6);
        retrievedJob.Steps[0].Name.Should().Be(WorkflowStepName.SzabaszatElőgyártás);
        retrievedJob.Steps[0].Status.Should().Be(WorkflowStepStatus.Pending);

        // Verify all steps are Pending initially
        retrievedJob.Steps.Should().AllSatisfy(step =>
        {
            step.Status.Should().Be(WorkflowStepStatus.Pending);
        });
    }

    [Fact]
    public async Task Given_OrderConfirmed_When_ProductionJobCreated_Then_ShouldPublishProductionJobStartedEvent()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        // Act
        var productionJob = ProductionJob.Create(
            orderId: orderId,
            customerId: customerId,
            projectName: "TEST-PROJECT",
            deadline: DateTimeOffset.UtcNow.AddDays(30)
        );

        // Assert - Verify domain event was raised
        productionJob.DomainEvents.Should().HaveCount(1);
        var domainEvent = productionJob.DomainEvents.First();
        domainEvent.Should().BeOfType<SpaceOS.Modules.Production.Domain.ProductionJobs.Events.ProductionJobStarted>();

        var productionJobStartedEvent = (SpaceOS.Modules.Production.Domain.ProductionJobs.Events.ProductionJobStarted)domainEvent;
        productionJobStartedEvent.JobId.Should().Be(productionJob.Id);
        productionJobStartedEvent.OrderId.Should().Be(orderId);
    }
}
