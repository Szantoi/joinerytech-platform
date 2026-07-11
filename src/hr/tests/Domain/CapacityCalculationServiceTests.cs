using FluentAssertions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Services;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

public class CapacityCalculationServiceTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _facilityId = Guid.NewGuid();
    private readonly ICapacityCalculationService _service = new CapacityCalculationService();

    [Fact]
    public void CalculateDailyCapacity_FullTimeEmployee_ShouldReturnEightHours()
    {
        // Arrange
        var employee = CreateEmployee("Test Employee", 40.0m);

        // Act
        var capacity = _service.CalculateDailyCapacity(employee);

        // Assert
        capacity.Should().Be(8.0m); // 40 / 5 = 8
    }

    [Fact]
    public void CalculateDailyCapacity_PartTimeEmployee_ShouldReturnProportionalHours()
    {
        // Arrange
        var employee = CreateEmployee("Part Time", 20.0m);

        // Act
        var capacity = _service.CalculateDailyCapacity(employee);

        // Assert
        capacity.Should().Be(4.0m); // 20 / 5 = 4
    }

    [Fact]
    public void CalculateDailyLoad_NoAbsences_ShouldReturnNotAbsent()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var date = new DateOnly(2026, 8, 4); // Monday
        var absences = Array.Empty<Absence>();
        var assignments = Array.Empty<object>();

        // Act
        var load = _service.CalculateDailyLoad(employeeId, date, assignments, absences);

        // Assert
        load.IsAbsent.Should().BeFalse();
        load.Hours.Should().Be(0); // No assignments yet
    }

    [Fact]
    public void CalculateDailyLoad_WithApprovedAbsence_ShouldReturnAbsent()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var date = new DateOnly(2026, 8, 4);
        var absence = CreateAbsence(employeeId, date, date, AbsenceStatus.Approved);
        var assignments = Array.Empty<object>();

        // Act
        var load = _service.CalculateDailyLoad(employeeId, date, assignments, new[] { absence });

        // Assert
        load.IsAbsent.Should().BeTrue();
        load.Hours.Should().Be(0);
    }

    [Fact]
    public void CalculateDailyLoad_WithInProgressAbsence_ShouldReturnAbsent()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var date = new DateOnly(2026, 8, 4);
        var absence = CreateAbsence(employeeId, date, date, AbsenceStatus.InProgress);
        var assignments = Array.Empty<object>();

        // Act
        var load = _service.CalculateDailyLoad(employeeId, date, assignments, new[] { absence });

        // Assert
        load.IsAbsent.Should().BeTrue();
    }

    [Fact]
    public void CalculateDailyLoad_WithCompletedAbsence_ShouldReturnAbsent()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var date = new DateOnly(2026, 8, 4);
        var absence = CreateAbsence(employeeId, date, date, AbsenceStatus.Completed);
        var assignments = Array.Empty<object>();

        // Act
        var load = _service.CalculateDailyLoad(employeeId, date, assignments, new[] { absence });

        // Assert
        load.IsAbsent.Should().BeTrue();
    }

    [Fact]
    public void CalculateDailyLoad_WithPendingAbsence_ShouldNotBlockCapacity()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var date = new DateOnly(2026, 8, 4);
        var absence = CreateAbsence(employeeId, date, date, AbsenceStatus.Pending);
        var assignments = Array.Empty<object>();

        // Act
        var load = _service.CalculateDailyLoad(employeeId, date, assignments, new[] { absence });

        // Assert
        load.IsAbsent.Should().BeFalse(); // Pending does not block
    }

    [Fact]
    public void CalculateDailyLoad_WithRejectedAbsence_ShouldNotBlockCapacity()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var date = new DateOnly(2026, 8, 4);
        var absence = CreateAbsence(employeeId, date, date, AbsenceStatus.Rejected);
        var assignments = Array.Empty<object>();

        // Act
        var load = _service.CalculateDailyLoad(employeeId, date, assignments, new[] { absence });

        // Assert
        load.IsAbsent.Should().BeFalse(); // Rejected does not block
    }

    [Fact]
    public void CalculateWeekSummary_NoAbsences_ShouldReturnZeroAbsentDays()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var monday = new DateOnly(2026, 8, 4); // Monday
        var absences = Array.Empty<Absence>();
        var assignments = Array.Empty<object>();

        // Act
        var summary = _service.CalculateWeekSummary(employeeId, monday, assignments, absences);

        // Assert
        summary.EmployeeId.Should().Be(employeeId);
        summary.WeekStart.Should().Be(monday);
        summary.DaysAbsent.Should().Be(0);
        summary.TotalHours.Should().Be(0); // No assignments
    }

    [Fact]
    public void CalculateWeekSummary_WithFullWeekAbsence_ShouldReturnFiveAbsentDays()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var monday = new DateOnly(2026, 8, 4); // Monday
        var absence = CreateAbsence(employeeId, monday, monday.AddDays(4), AbsenceStatus.Approved); // Mon-Fri
        var assignments = Array.Empty<object>();

        // Act
        var summary = _service.CalculateWeekSummary(employeeId, monday, assignments, new[] { absence });

        // Assert
        summary.DaysAbsent.Should().Be(5); // All 5 weekdays
    }

    [Fact]
    public void CalculateWeekSummary_WithPartialWeekAbsence_ShouldReturnCorrectCount()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var monday = new DateOnly(2026, 8, 4);
        var absence = CreateAbsence(employeeId, monday, monday.AddDays(1), AbsenceStatus.Approved); // Mon-Tue
        var assignments = Array.Empty<object>();

        // Act
        var summary = _service.CalculateWeekSummary(employeeId, monday, assignments, new[] { absence });

        // Assert
        summary.DaysAbsent.Should().Be(2); // Mon + Tue
    }

    [Fact]
    public void DetectOverloads_NoAbsences_ShouldReturnEmpty()
    {
        // Arrange
        var employee = CreateEmployee("Test", 40.0m);
        var startDate = new DateOnly(2026, 8, 4);
        var endDate = new DateOnly(2026, 8, 8);
        var absences = Array.Empty<Absence>();
        var assignments = Array.Empty<object>();

        // Act
        var overloads = _service.DetectOverloads(new[] { employee }, startDate, endDate, assignments, absences);

        // Assert
        overloads.Should().BeEmpty(); // No overloads with no assignments
    }

    private Employee CreateEmployee(string name, decimal weeklyHours)
    {
        var payGrade = PayGrade.Create("Grade 5", 2500);
        return Employee.Create(
            _tenantId,
            name,
            "Operator",
            Department.Production,
            _facilityId,
            payGrade,
            weeklyHours,
            $"{name.Replace(" ", "").ToLower()}@example.com");
    }

    private Absence CreateAbsence(EmployeeId employeeId, DateOnly startDate, DateOnly endDate, AbsenceStatus status)
    {
        var absence = Absence.Create(
            _tenantId,
            employeeId,
            AbsenceType.Vacation,
            startDate,
            endDate,
            "Test absence");

        // Transition to desired status
        if (status == AbsenceStatus.Approved)
        {
            absence.Approve(Guid.NewGuid());
        }
        else if (status == AbsenceStatus.Rejected)
        {
            absence.Reject(Guid.NewGuid(), "Test rejection");
        }
        else if (status == AbsenceStatus.InProgress)
        {
            absence.Approve(Guid.NewGuid());
            absence.StartAbsence();
        }
        else if (status == AbsenceStatus.Completed)
        {
            absence.Approve(Guid.NewGuid());
            absence.StartAbsence();
            absence.CompleteAbsence();
        }

        return absence;
    }
}
