using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Events;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Domain;

public class WorkOrderTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly AssetId _assetId = AssetId.New();
    private readonly Guid _employeeId = Guid.NewGuid();
    private readonly Guid _partnerId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateValidWorkOrder()
    {
        // Arrange & Act
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Replace broken belt",
            "Belt snapped during operation",
            2.5m,
            true);

        // Assert
        wo.Should().NotBeNull();
        wo.Title.Should().Be("Replace broken belt");
        wo.Type.Should().Be(WorkOrderType.Corrective);
        wo.Priority.Should().Be(WorkOrderPriority.High);
        wo.Status.Should().Be(WorkOrderStatus.Reported);
        wo.RequiresDowntime.Should().BeTrue();
        wo.EstimatedHours.Should().Be(2.5m);

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<WorkOrderReportedEvent>();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidTitle_ShouldThrow(string? invalidTitle)
    {
        // Act
        var act = () => WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            invalidTitle!,
            "Valid description");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Work order title is required");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidDescription_ShouldThrow(string? invalidDescription)
    {
        // Act
        var act = () => WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Valid title",
            invalidDescription!);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Work order description is required");
    }

    [Fact]
    public void Create_WithNegativeEstimatedHours_ShouldThrow()
    {
        // Act
        var act = () => WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Valid title",
            "Valid description",
            -5m);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Estimated hours must be positive");
    }

    [Fact]
    public void Schedule_ShouldTransitionToScheduled()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Preventive,
            WorkOrderPriority.Medium,
            "Oil change",
            "Scheduled maintenance");
        wo.ClearDomainEvents(); // Clear initial events

        var futureDate = DateTime.UtcNow.AddDays(7);

        // Act
        wo.Schedule(futureDate, 2.0m);

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Scheduled);
        wo.ScheduledAt.Should().Be(futureDate);
        wo.EstimatedHours.Should().Be(2.0m);

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<WorkOrderScheduledEvent>();
    }

    [Fact]
    public void Schedule_WithPastDate_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Preventive,
            WorkOrderPriority.Medium,
            "Oil change",
            "Scheduled maintenance");

        var pastDate = DateTime.UtcNow.AddDays(-1);

        // Act
        var act = () => wo.Schedule(pastDate, 2.0m);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Scheduled date must be in the future");
    }

    [Fact]
    public void AssignInternalTechnician_ShouldAssignSuccessfully()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.ClearDomainEvents(); // Clear initial events

        // Act
        wo.AssignInternalTechnician(_employeeId);

        // Assert
        wo.AssignmentType.Should().Be(AssignmentType.Internal);
        wo.AssignedEmployeeId.Should().Be(_employeeId);
        wo.AssignedPartnerId.Should().BeNull();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var assignedEvent = events.First() as WorkOrderAssignedEvent;
        assignedEvent.Should().NotBeNull();
        assignedEvent!.AssignmentType.Should().Be(AssignmentType.Internal);
        assignedEvent.AssignedEmployeeId.Should().Be(_employeeId);
    }

    [Fact]
    public void AssignExternalContractor_ShouldAssignSuccessfully()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.ClearDomainEvents(); // Clear initial events

        // Act
        wo.AssignExternalContractor(_partnerId);

        // Assert
        wo.AssignmentType.Should().Be(AssignmentType.External);
        wo.AssignedPartnerId.Should().Be(_partnerId);
        wo.AssignedEmployeeId.Should().BeNull();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var assignedEvent = events.First() as WorkOrderAssignedEvent;
        assignedEvent.Should().NotBeNull();
        assignedEvent!.AssignmentType.Should().Be(AssignmentType.External);
        assignedEvent.AssignedPartnerId.Should().Be(_partnerId);
    }

    [Fact]
    public void AssignInternalTechnician_AfterInProgress_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();

        // Act
        var act = () => wo.AssignInternalTechnician(Guid.NewGuid());

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Cannot assign technician in {WorkOrderStatus.InProgress} status");
    }

    [Fact]
    public void StartWork_WithoutAssignment_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);

        // Act
        var act = () => wo.StartWork();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Work order must be assigned before starting");
    }

    [Fact]
    public void StartWork_WithoutScheduling_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.AssignInternalTechnician(_employeeId);

        // Act
        var act = () => wo.StartWork();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Cannot start work in {WorkOrderStatus.Reported} status, must be Scheduled first");
    }

    [Fact]
    public void StartWork_ShouldTransitionToInProgress()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement",
            requiresDowntime: true);
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.StartWork();

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.InProgress);
        wo.StartedAt.Should().NotBeNull();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var startedEvent = events.First() as WorkOrderStartedEvent;
        startedEvent.Should().NotBeNull();
        startedEvent!.RequiresDowntime.Should().BeTrue();
        startedEvent.Type.Should().Be(WorkOrderType.Corrective);
    }

    [Fact]
    public void Complete_ShouldTransitionToCompleted()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.Complete(3.5m);

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Completed);
        wo.ActualHours.Should().Be(3.5m);
        wo.CompletedAt.Should().NotBeNull();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var completedEvent = events.First() as WorkOrderCompletedEvent;
        completedEvent.Should().NotBeNull();
        completedEvent!.ActualHours.Should().Be(3.5m);
    }

    [Fact]
    public void Complete_WithNegativeHours_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();

        // Act
        var act = () => wo.Complete(-1m);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Actual hours must be positive");
    }

    [Fact]
    public void Complete_WhenNotInProgress_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");

        // Act
        var act = () => wo.Complete(2.0m);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Cannot complete work order in {WorkOrderStatus.Reported} status");
    }

    [Fact]
    public void Postpone_ShouldTransitionToPostponed()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Preventive,
            WorkOrderPriority.Low,
            "Oil change",
            "Scheduled maintenance");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.Postpone("Parts not available");

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Postponed);
        wo.PostponementReason.Should().Be("Parts not available");

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var postponedEvent = events.First() as WorkOrderPostponedEvent;
        postponedEvent.Should().NotBeNull();
        postponedEvent!.Reason.Should().Be("Parts not available");
    }

    [Fact]
    public void Reject_ShouldTransitionToRejected()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.Reject("Not a valid issue");

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Rejected);
        wo.RejectionReason.Should().Be("Not a valid issue");

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<WorkOrderRejectedEvent>();
    }

    [Fact]
    public void Reopen_FromPostponed_ShouldTransitionToReported()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Preventive,
            WorkOrderPriority.Low,
            "Oil change",
            "Scheduled maintenance");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.Postpone("Parts not available");
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.Reopen();

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Reported);
        wo.PostponementReason.Should().BeNull();
        wo.AssignmentType.Should().BeNull();
        wo.AssignedEmployeeId.Should().BeNull();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<WorkOrderReopenedEvent>();
    }

    [Fact]
    public void Reopen_FromRejected_ShouldTransitionToReported()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Reject("Not valid");
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.Reopen();

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Reported);
        wo.RejectionReason.Should().BeNull();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<WorkOrderReopenedEvent>();
    }

    [Fact]
    public void Reopen_FromCompleted_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();
        wo.Complete(2.0m);

        // Act
        var act = () => wo.Reopen();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Cannot reopen work order in {WorkOrderStatus.Completed} status");
    }

    [Fact]
    public void AddPart_ShouldAddPartSuccessfully()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.ClearDomainEvents(); // Clear events

        var unitPrice = Money.Create(5000m, "HUF");

        // Act
        wo.AddPart("BELT-V-001", 2, unitPrice);

        // Assert
        wo.Parts.Should().HaveCount(1);
        wo.Parts.First().CatalogCode.Should().Be("BELT-V-001");
        wo.Parts.First().Quantity.Should().Be(2);

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var partEvent = events.First() as WorkOrderPartAddedEvent;
        partEvent.Should().NotBeNull();
        partEvent!.CatalogCode.Should().Be("BELT-V-001");
        partEvent.Quantity.Should().Be(2);
    }

    [Fact]
    public void AddPart_WhenCompleted_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();
        wo.Complete(2.0m);

        var unitPrice = Money.Create(5000m, "HUF");

        // Act
        var act = () => wo.AddPart("BELT-V-001", 2, unitPrice);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot add parts to completed work orders");
    }

    [Fact]
    public void RemovePart_ShouldRemovePartSuccessfully()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        var unitPrice = Money.Create(5000m, "HUF");
        wo.AddPart("BELT-V-001", 2, unitPrice);
        var partId = wo.Parts.First().Id;
        wo.ClearDomainEvents(); // Clear events

        // Act
        wo.RemovePart(partId);

        // Assert
        wo.Parts.Should().BeEmpty();

        var events = wo.GetDomainEvents();
        events.Should().HaveCount(1);
        var removedEvent = events.First() as WorkOrderPartRemovedEvent;
        removedEvent.Should().NotBeNull();
        removedEvent!.PartId.Should().Be(partId);
    }

    [Fact]
    public void RemovePart_WhenCompleted_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");
        var unitPrice = Money.Create(5000m, "HUF");
        wo.AddPart("BELT-V-001", 2, unitPrice);
        var partId = wo.Parts.First().Id;

        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(_employeeId);
        wo.StartWork();
        wo.Complete(2.0m);

        // Act
        var act = () => wo.RemovePart(partId);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot remove parts from completed work orders");
    }

    [Fact]
    public void RemovePart_WithInvalidId_ShouldThrow()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix belt",
            "Belt replacement");

        // Act
        var act = () => wo.RemovePart("invalid-part-id");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Part with ID 'invalid-part-id' not found");
    }
}
