using FluentAssertions;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.FSM;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.FSM;

public class InspectionStateMachineTests
{
    [Theory]
    [InlineData(InspectionStatus.Planned, InspectionStatus.InProgress, true)]
    [InlineData(InspectionStatus.InProgress, InspectionStatus.Completed, true)]
    [InlineData(InspectionStatus.Planned, InspectionStatus.Completed, false)] // Cannot skip InProgress
    [InlineData(InspectionStatus.Completed, InspectionStatus.InProgress, false)] // Terminal state
    [InlineData(InspectionStatus.Completed, InspectionStatus.Planned, false)] // Terminal state
    public void IsValidTransition_ShouldReturnExpectedResult(
        InspectionStatus from,
        InspectionStatus to,
        bool expected)
    {
        // Act
        var result = InspectionStatusTransitions.IsValidTransition(from, to);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void GetAllowedTransitions_FromPlanned_ShouldReturnInProgress()
    {
        // Act
        var allowed = InspectionStatusTransitions.GetAllowedTransitions(InspectionStatus.Planned);

        // Assert
        allowed.Should().HaveCount(1);
        allowed.Should().Contain(InspectionStatus.InProgress);
    }

    [Fact]
    public void GetAllowedTransitions_FromInProgress_ShouldReturnCompleted()
    {
        // Act
        var allowed = InspectionStatusTransitions.GetAllowedTransitions(InspectionStatus.InProgress);

        // Assert
        allowed.Should().HaveCount(1);
        allowed.Should().Contain(InspectionStatus.Completed);
    }

    [Fact]
    public void GetAllowedTransitions_FromCompleted_ShouldReturnEmpty()
    {
        // Act
        var allowed = InspectionStatusTransitions.GetAllowedTransitions(InspectionStatus.Completed);

        // Assert
        allowed.Should().BeEmpty();
    }
}
