using FluentAssertions;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Services;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Domain;

public class PreventiveMaintenanceSchedulerServiceTests
{
    private readonly PreventiveMaintenanceSchedulerService _service = new();
    private readonly Guid _employeeId = Guid.NewGuid();

    [Fact]
    public void IsDue_IntervalBased_NeverDone_ShouldReturnTrue()
    {
        // Arrange
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            _employeeId);

        var currentDate = new DateOnly(2026, 7, 6);

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_IntervalBased_DueToday_ShouldReturnTrue()
    {
        // Arrange
        var lastDone = new DateOnly(2026, 6, 6); // 30 days ago
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDone: lastDone);

        var currentDate = new DateOnly(2026, 7, 6); // Exactly 30 days later

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_IntervalBased_OverDue_ShouldReturnTrue()
    {
        // Arrange
        var lastDone = new DateOnly(2026, 5, 1); // 66 days ago
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDone: lastDone);

        var currentDate = new DateOnly(2026, 7, 6);

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_IntervalBased_NotYetDue_ShouldReturnFalse()
    {
        // Arrange
        var lastDone = new DateOnly(2026, 6, 20); // 16 days ago
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDone: lastDone);

        var currentDate = new DateOnly(2026, 7, 6);

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeFalse();
    }

    [Fact]
    public void IsDue_IntervalBased_JustDoneYesterday_ShouldReturnFalse()
    {
        // Arrange
        var lastDone = new DateOnly(2026, 7, 5); // 1 day ago
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDone: lastDone);

        var currentDate = new DateOnly(2026, 7, 6);

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeFalse();
    }

    [Fact]
    public void IsDue_OperatingHoursBased_NeverDone_ShouldReturnTrue()
    {
        // Arrange
        var plan = MaintenancePlan.CreateHoursBased(
            "Every 500 hours oil change",
            500m,
            3.0m,
            AssignmentType.Internal,
            _employeeId);

        var currentOperatingHours = 100m;

        // Act
        var isDue = _service.IsDue(plan, DateOnly.MinValue, currentOperatingHours);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_OperatingHoursBased_DueNow_ShouldReturnTrue()
    {
        // Arrange
        var plan = MaintenancePlan.CreateHoursBased(
            "Every 500 hours oil change",
            500m,
            3.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDoneHours: 1000m);

        var currentOperatingHours = 1500m; // Exactly 500 hours later

        // Act
        var isDue = _service.IsDue(plan, DateOnly.MinValue, currentOperatingHours);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_OperatingHoursBased_Overdue_ShouldReturnTrue()
    {
        // Arrange
        var plan = MaintenancePlan.CreateHoursBased(
            "Every 500 hours oil change",
            500m,
            3.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDoneHours: 1000m);

        var currentOperatingHours = 2000m; // 1000 hours later (overdue by 500)

        // Act
        var isDue = _service.IsDue(plan, DateOnly.MinValue, currentOperatingHours);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_OperatingHoursBased_NotYetDue_ShouldReturnFalse()
    {
        // Arrange
        var plan = MaintenancePlan.CreateHoursBased(
            "Every 500 hours oil change",
            500m,
            3.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDoneHours: 1000m);

        var currentOperatingHours = 1200m; // Only 200 hours later

        // Act
        var isDue = _service.IsDue(plan, DateOnly.MinValue, currentOperatingHours);

        // Assert
        isDue.Should().BeFalse();
    }

    [Fact]
    public void IsDue_OperatingHoursBased_JustDone_ShouldReturnFalse()
    {
        // Arrange
        var plan = MaintenancePlan.CreateHoursBased(
            "Every 500 hours oil change",
            500m,
            3.0m,
            AssignmentType.Internal,
            _employeeId,
            lastDoneHours: 1495m);

        var currentOperatingHours = 1500m; // Only 5 hours later

        // Act
        var isDue = _service.IsDue(plan, DateOnly.MinValue, currentOperatingHours);

        // Assert
        isDue.Should().BeFalse();
    }

    [Fact]
    public void IsDue_WithWeeklyInterval_ShouldWorkCorrectly()
    {
        // Arrange
        var lastDone = new DateOnly(2026, 6, 29); // 1 week ago
        var plan = MaintenancePlan.CreateIntervalBased(
            "Weekly inspection",
            7,
            0.5m,
            AssignmentType.Internal,
            _employeeId,
            lastDone: lastDone);

        var currentDate = new DateOnly(2026, 7, 6); // Exactly 7 days later

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_WithQuarterlyInterval_ShouldWorkCorrectly()
    {
        // Arrange
        var lastDone = new DateOnly(2026, 4, 1); // 96 days ago (Q1 end)
        var plan = MaintenancePlan.CreateIntervalBased(
            "Quarterly maintenance",
            90,
            8.0m,
            AssignmentType.External,
            lastDone: lastDone);

        var currentDate = new DateOnly(2026, 7, 6); // Q2 end

        // Act
        var isDue = _service.IsDue(plan, currentDate, 0);

        // Assert
        isDue.Should().BeTrue();
    }
}
