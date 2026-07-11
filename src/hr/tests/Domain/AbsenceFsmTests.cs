using FluentAssertions;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.FSM;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

public class AbsenceFsmTests
{
    [Fact]
    public void IsValidTransition_Pending_To_Approved_ShouldBeValid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.Pending,
            AbsenceStatus.Approved);

        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Pending_To_Rejected_ShouldBeValid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.Pending,
            AbsenceStatus.Rejected);

        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Approved_To_InProgress_ShouldBeValid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.Approved,
            AbsenceStatus.InProgress);

        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_InProgress_To_Completed_ShouldBeValid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.InProgress,
            AbsenceStatus.Completed);

        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Rejected_To_Pending_ShouldBeValid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.Rejected,
            AbsenceStatus.Pending);

        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValidTransition_Completed_To_Pending_ShouldBeInvalid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.Completed,
            AbsenceStatus.Pending);

        isValid.Should().BeFalse();
    }

    [Fact]
    public void IsValidTransition_Pending_To_Completed_ShouldBeInvalid()
    {
        var isValid = AbsenceStatusTransitions.IsValidTransition(
            AbsenceStatus.Pending,
            AbsenceStatus.Completed);

        isValid.Should().BeFalse();
    }

    [Fact]
    public void GetAllowedTransitions_Pending_ShouldReturnCorrectStates()
    {
        var allowed = AbsenceStatusTransitions.GetAllowedTransitions(AbsenceStatus.Pending);

        allowed.Should().HaveCount(2);
        allowed.Should().Contain(AbsenceStatus.Approved);
        allowed.Should().Contain(AbsenceStatus.Rejected);
    }

    [Fact]
    public void GetAllowedTransitions_Completed_ShouldReturnEmpty()
    {
        var allowed = AbsenceStatusTransitions.GetAllowedTransitions(AbsenceStatus.Completed);

        allowed.Should().BeEmpty();
    }

    [Fact]
    public void IsTerminalState_Completed_ShouldReturnTrue()
    {
        var isTerminal = AbsenceStatusTransitions.IsTerminalState(AbsenceStatus.Completed);

        isTerminal.Should().BeTrue();
    }
}
