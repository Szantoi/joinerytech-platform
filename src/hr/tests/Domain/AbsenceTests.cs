using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Events;
using SpaceOS.Modules.HR.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

public class AbsenceTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly EmployeeId _employeeId = EmployeeId.New();

    [Fact]
    public void Create_ValidAbsence_ShouldSucceed()
    {
        // Arrange & Act
        var absence = Absence.Create(
            _tenantId,
            _employeeId,
            AbsenceType.Vacation,
            new DateOnly(2026, 8, 1),
            new DateOnly(2026, 8, 5),
            "Summer vacation");

        // Assert
        absence.Should().NotBeNull();
        absence.Status.Should().Be(AbsenceStatus.Pending);
        absence.WorkDays.Should().Be(3); // Mon-Wed
        
        var events = absence.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AbsenceRequestedEvent>();
    }

    [Fact]
    public void Create_EndDateBeforeStartDate_ShouldThrow()
    {
        // Act
        var act = () => Absence.Create(
            _tenantId,
            _employeeId,
            AbsenceType.Vacation,
            new DateOnly(2026, 8, 5),
            new DateOnly(2026, 8, 1),
            "Invalid dates");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("End date must be greater than or equal to start date");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidReason_ShouldThrow(string? invalidReason)
    {
        // Act
        var act = () => Absence.Create(
            _tenantId,
            _employeeId,
            AbsenceType.Vacation,
            new DateOnly(2026, 8, 1),
            new DateOnly(2026, 8, 5),
            invalidReason!);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Absence reason is required");
    }

    [Fact]
    public void Approve_FromPending_ShouldTransitionToApproved()
    {
        // Arrange
        var absence = CreateTestAbsence();
        absence.ClearDomainEvents();
        var approvedBy = Guid.NewGuid();

        // Act
        absence.Approve(approvedBy);

        // Assert
        absence.Status.Should().Be(AbsenceStatus.Approved);
        absence.ApprovedByUserId.Should().Be(approvedBy);
        absence.ApprovedAt.Should().NotBeNull();

        var events = absence.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AbsenceApprovedEvent>();
    }

    [Fact]
    public void Approve_FromNonPending_ShouldThrow()
    {
        // Arrange
        var absence = CreateTestAbsence();
        absence.Approve(Guid.NewGuid());

        // Act
        var act = () => absence.Approve(Guid.NewGuid());

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot approve absence in * status");
    }

    [Fact]
    public void Reject_FromPending_ShouldTransitionToRejected()
    {
        // Arrange
        var absence = CreateTestAbsence();
        absence.ClearDomainEvents();
        var rejectedBy = Guid.NewGuid();

        // Act
        absence.Reject(rejectedBy, "Insufficient vacation days");

        // Assert
        absence.Status.Should().Be(AbsenceStatus.Rejected);
        absence.RejectedByUserId.Should().Be(rejectedBy);
        absence.RejectedAt.Should().NotBeNull();
        absence.RejectionReason.Should().Be("Insufficient vacation days");

        var events = absence.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AbsenceRejectedEvent>();
    }

    [Fact]
    public void Reject_WithoutReason_ShouldThrow()
    {
        // Arrange
        var absence = CreateTestAbsence();

        // Act
        var act = () => absence.Reject(Guid.NewGuid(), "");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Rejection reason is required");
    }

    [Fact]
    public void StartAbsence_FromApproved_ShouldTransitionToInProgress()
    {
        // Arrange
        var absence = CreateTestAbsence();
        absence.Approve(Guid.NewGuid());
        absence.ClearDomainEvents();

        // Act
        absence.StartAbsence();

        // Assert
        absence.Status.Should().Be(AbsenceStatus.InProgress);

        var events = absence.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AbsenceStartedEvent>();
    }

    [Fact]
    public void StartAbsence_FromNonApproved_ShouldThrow()
    {
        // Arrange
        var absence = CreateTestAbsence();

        // Act
        var act = () => absence.StartAbsence();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot start absence in * status*");
    }

    [Fact]
    public void CompleteAbsence_FromInProgress_ShouldTransitionToCompleted()
    {
        // Arrange
        var absence = CreateTestAbsence();
        absence.Approve(Guid.NewGuid());
        absence.StartAbsence();
        absence.ClearDomainEvents();

        // Act
        absence.CompleteAbsence();

        // Assert
        absence.Status.Should().Be(AbsenceStatus.Completed);

        var events = absence.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AbsenceCompletedEvent>();
    }

    [Fact]
    public void CompleteAbsence_FromNonInProgress_ShouldThrow()
    {
        // Arrange
        var absence = CreateTestAbsence();

        // Act
        var act = () => absence.CompleteAbsence();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot complete absence in * status*");
    }

    [Fact]
    public void Reopen_FromRejected_ShouldTransitionToPending()
    {
        // Arrange
        var absence = CreateTestAbsence();
        absence.Reject(Guid.NewGuid(), "Initially rejected");
        absence.ClearDomainEvents();

        // Act
        absence.Reopen();

        // Assert
        absence.Status.Should().Be(AbsenceStatus.Pending);
        absence.RejectedByUserId.Should().BeNull();
        absence.RejectedAt.Should().BeNull();
        absence.RejectionReason.Should().BeNull();

        var events = absence.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AbsenceReopenedEvent>();
    }

    [Fact]
    public void Reopen_FromNonRejected_ShouldThrow()
    {
        // Arrange
        var absence = CreateTestAbsence();

        // Act
        var act = () => absence.Reopen();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("*only Rejected absences can be reopened");
    }

    [Theory]
    [InlineData("2026-08-03", "2026-08-07", 5)] // Mon-Fri (full work week)
    [InlineData("2026-08-01", "2026-08-01", 0)] // Single Saturday
    [InlineData("2026-08-02", "2026-08-02", 0)] // Single Sunday
    [InlineData("2026-08-03", "2026-08-03", 1)] // Single Monday (weekday)
    [InlineData("2026-08-04", "2026-08-10", 5)] // Tue-Mon (only 5 weekdays: Tue-Fri + Mon)
    public void Create_CalculatesWorkDaysCorrectly(string startStr, string endStr, int expectedWorkDays)
    {
        // Arrange & Act
        var absence = Absence.Create(
            _tenantId,
            _employeeId,
            AbsenceType.Vacation,
            DateOnly.Parse(startStr),
            DateOnly.Parse(endStr),
            "Test");

        // Assert
        absence.WorkDays.Should().Be(expectedWorkDays);
    }

    [Fact]
    public void FullWorkflow_PendingToCompleted_ShouldSucceed()
    {
        // Arrange
        var absence = CreateTestAbsence();
        var approverId = Guid.NewGuid();

        // Act & Assert
        absence.Status.Should().Be(AbsenceStatus.Pending);
        
        absence.Approve(approverId);
        absence.Status.Should().Be(AbsenceStatus.Approved);
        
        absence.StartAbsence();
        absence.Status.Should().Be(AbsenceStatus.InProgress);
        
        absence.CompleteAbsence();
        absence.Status.Should().Be(AbsenceStatus.Completed);
    }

    [Fact]
    public void RejectionWorkflow_RejectedThenReopened_ShouldSucceed()
    {
        // Arrange
        var absence = CreateTestAbsence();
        var rejecterId = Guid.NewGuid();

        // Act & Assert
        absence.Status.Should().Be(AbsenceStatus.Pending);
        
        absence.Reject(rejecterId, "Not enough vacation days");
        absence.Status.Should().Be(AbsenceStatus.Rejected);
        
        absence.Reopen();
        absence.Status.Should().Be(AbsenceStatus.Pending);
    }

    private Absence CreateTestAbsence()
    {
        return Absence.Create(
            _tenantId,
            _employeeId,
            AbsenceType.Vacation,
            new DateOnly(2026, 8, 4),
            new DateOnly(2026, 8, 8),
            "Test absence");
    }
}
