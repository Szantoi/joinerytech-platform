using FluentAssertions;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.FSM;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.FSM;

public class TicketStateMachineTests
{
    [Theory]
    [InlineData(TicketStatus.Reported, TicketStatus.Assigned, true)]
    [InlineData(TicketStatus.Assigned, TicketStatus.InProgress, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Resolved, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Rejected, true)]
    [InlineData(TicketStatus.Rejected, TicketStatus.Reported, true)]
    [InlineData(TicketStatus.Reported, TicketStatus.InProgress, false)] // Cannot skip Assigned
    [InlineData(TicketStatus.Assigned, TicketStatus.Resolved, false)] // Cannot skip InProgress
    [InlineData(TicketStatus.Resolved, TicketStatus.InProgress, false)] // Terminal state
    [InlineData(TicketStatus.Resolved, TicketStatus.Reported, false)] // Terminal state
    public void IsValidTransition_ShouldReturnExpectedResult(
        TicketStatus from,
        TicketStatus to,
        bool expected)
    {
        // Act
        var result = TicketStatusTransitions.IsValidTransition(from, to);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void GetAllowedTransitions_FromReported_ShouldReturnAssigned()
    {
        // Act
        var allowed = TicketStatusTransitions.GetAllowedTransitions(TicketStatus.Reported);

        // Assert
        allowed.Should().HaveCount(1);
        allowed.Should().Contain(TicketStatus.Assigned);
    }

    [Fact]
    public void GetAllowedTransitions_FromAssigned_ShouldReturnInProgress()
    {
        // Act
        var allowed = TicketStatusTransitions.GetAllowedTransitions(TicketStatus.Assigned);

        // Assert
        allowed.Should().HaveCount(1);
        allowed.Should().Contain(TicketStatus.InProgress);
    }

    [Fact]
    public void GetAllowedTransitions_FromInProgress_ShouldReturnResolvedAndRejected()
    {
        // Act
        var allowed = TicketStatusTransitions.GetAllowedTransitions(TicketStatus.InProgress);

        // Assert
        allowed.Should().HaveCount(2);
        allowed.Should().Contain(TicketStatus.Resolved);
        allowed.Should().Contain(TicketStatus.Rejected);
    }

    [Fact]
    public void GetAllowedTransitions_FromRejected_ShouldReturnReported()
    {
        // Act
        var allowed = TicketStatusTransitions.GetAllowedTransitions(TicketStatus.Rejected);

        // Assert
        allowed.Should().HaveCount(1);
        allowed.Should().Contain(TicketStatus.Reported);
    }

    [Fact]
    public void GetAllowedTransitions_FromResolved_ShouldReturnEmpty()
    {
        // Act
        var allowed = TicketStatusTransitions.GetAllowedTransitions(TicketStatus.Resolved);

        // Assert
        allowed.Should().BeEmpty();
    }

    [Theory]
    [InlineData(TicketStatus.Resolved, true)]
    [InlineData(TicketStatus.Reported, false)]
    [InlineData(TicketStatus.Assigned, false)]
    [InlineData(TicketStatus.InProgress, false)]
    [InlineData(TicketStatus.Rejected, false)]
    public void IsTerminalState_ShouldReturnExpectedResult(TicketStatus status, bool expected)
    {
        // Act
        var result = TicketStatusTransitions.IsTerminalState(status);

        // Assert
        result.Should().Be(expected);
    }
}
