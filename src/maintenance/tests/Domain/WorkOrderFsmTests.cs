using FluentAssertions;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.FSM;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Domain;

public class WorkOrderFsmTests
{
    [Fact]
    public void IsValidTransition_Reported_To_Scheduled_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Reported,
            WorkOrderStatus.Scheduled);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Reported_To_InProgress_ShouldBeInvalid()
    {
        // MAINT-BE-TRANSITIONS: the table mirrors the aggregate (single source of
        // truth) — StartWork() only runs from Scheduled, so the former
        // Reported → InProgress ("if assigned") edge was removed.
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Reported,
            WorkOrderStatus.InProgress);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public void IsValidTransition_Reported_To_Rejected_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Reported,
            WorkOrderStatus.Rejected);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Scheduled_To_InProgress_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Scheduled,
            WorkOrderStatus.InProgress);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Scheduled_To_Postponed_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Scheduled,
            WorkOrderStatus.Postponed);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Scheduled_To_Rejected_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Scheduled,
            WorkOrderStatus.Rejected);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_InProgress_To_Completed_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.InProgress,
            WorkOrderStatus.Completed);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_InProgress_To_Postponed_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.InProgress,
            WorkOrderStatus.Postponed);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Postponed_To_Reported_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Postponed,
            WorkOrderStatus.Reported);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Rejected_To_Reported_ShouldBeValid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Rejected,
            WorkOrderStatus.Reported);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Completed_To_Reported_ShouldBeInvalid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Completed,
            WorkOrderStatus.Reported);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public void IsValidTransition_Reported_To_Completed_ShouldBeInvalid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.Reported,
            WorkOrderStatus.Completed);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public void IsValidTransition_InProgress_To_Rejected_ShouldBeInvalid()
    {
        // Act
        var isValid = WorkOrderStatusTransitions.IsValidTransition(
            WorkOrderStatus.InProgress,
            WorkOrderStatus.Rejected);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public void GetAllowedTransitions_Reported_ShouldReturnCorrectStates()
    {
        // Act
        var allowed = WorkOrderStatusTransitions.GetAllowedTransitions(WorkOrderStatus.Reported);

        // Assert (aggregate mirror: schedule → Scheduled, reject → Rejected)
        allowed.Should().HaveCount(2);
        allowed.Should().Contain(WorkOrderStatus.Scheduled);
        allowed.Should().Contain(WorkOrderStatus.Rejected);
    }

    [Fact]
    public void GetAllowedTransitions_Scheduled_ShouldReturnCorrectStates()
    {
        // Act
        var allowed = WorkOrderStatusTransitions.GetAllowedTransitions(WorkOrderStatus.Scheduled);

        // Assert
        allowed.Should().HaveCount(3);
        allowed.Should().Contain(WorkOrderStatus.InProgress);
        allowed.Should().Contain(WorkOrderStatus.Postponed);
        allowed.Should().Contain(WorkOrderStatus.Rejected);
    }

    [Fact]
    public void GetAllowedTransitions_InProgress_ShouldReturnCorrectStates()
    {
        // Act
        var allowed = WorkOrderStatusTransitions.GetAllowedTransitions(WorkOrderStatus.InProgress);

        // Assert
        allowed.Should().HaveCount(2);
        allowed.Should().Contain(WorkOrderStatus.Completed);
        allowed.Should().Contain(WorkOrderStatus.Postponed);
    }

    [Fact]
    public void GetAllowedTransitions_Completed_ShouldReturnEmpty()
    {
        // Act
        var allowed = WorkOrderStatusTransitions.GetAllowedTransitions(WorkOrderStatus.Completed);

        // Assert
        allowed.Should().BeEmpty();
    }

    [Fact]
    public void IsTerminalState_Completed_ShouldReturnTrue()
    {
        // Act
        var isTerminal = WorkOrderStatusTransitions.IsTerminalState(WorkOrderStatus.Completed);

        // Assert
        isTerminal.Should().BeTrue();
    }

    [Fact]
    public void IsTerminalState_Reported_ShouldReturnFalse()
    {
        // Act
        var isTerminal = WorkOrderStatusTransitions.IsTerminalState(WorkOrderStatus.Reported);

        // Assert
        isTerminal.Should().BeFalse();
    }

    [Fact]
    public void IsTerminalState_InProgress_ShouldReturnFalse()
    {
        // Act
        var isTerminal = WorkOrderStatusTransitions.IsTerminalState(WorkOrderStatus.InProgress);

        // Assert
        isTerminal.Should().BeFalse();
    }

    /// <summary>
    /// MAINT-BE-TRANSITIONS: the full table must be the 1:1 mirror of the portal
    /// WORK_ORDER_FSM (joinerytech-portal services/maintenance/fsm.ts) and of the
    /// aggregate action guards — this locks the whole contract in one assertion set.
    /// </summary>
    [Theory]
    [InlineData(WorkOrderStatus.Reported, new[] { WorkOrderStatus.Scheduled, WorkOrderStatus.Rejected })]
    [InlineData(WorkOrderStatus.Scheduled, new[] { WorkOrderStatus.InProgress, WorkOrderStatus.Postponed, WorkOrderStatus.Rejected })]
    [InlineData(WorkOrderStatus.InProgress, new[] { WorkOrderStatus.Completed, WorkOrderStatus.Postponed })]
    [InlineData(WorkOrderStatus.Postponed, new[] { WorkOrderStatus.Reported })]
    [InlineData(WorkOrderStatus.Rejected, new[] { WorkOrderStatus.Reported })]
    [InlineData(WorkOrderStatus.Completed, new WorkOrderStatus[0])]
    public void GetAllowedTransitions_ShouldMirrorPortalFsmTable(
        WorkOrderStatus from,
        WorkOrderStatus[] expected)
    {
        // Act
        var allowed = WorkOrderStatusTransitions.GetAllowedTransitions(from);

        // Assert
        allowed.Should().BeEquivalentTo(expected);
    }
}
