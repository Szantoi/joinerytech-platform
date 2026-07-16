using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Services;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

/// <summary>
/// The server-computed weekly capacity grid (the /api/hr/capacity response body) —
/// the counterpart of the portal's calc.ts tests: daily capacity = weekly hours /
/// configured workdays, a blocking absence zeroes the day, the requested/rejected
/// one does not.
/// </summary>
public class WeekCapacityGridTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _facilityId = Guid.NewGuid();
    private static readonly DateOnly Monday = new(2026, 8, 3);

    private readonly ICapacityCalculationService _service = new CapacityCalculationService();

    private Employee CreateEmployee(string name, decimal weeklyHours) => Employee.Create(
        _tenantId,
        name,
        "CNC gépkezelő",
        Department.Production,
        _facilityId,
        PayGradeBand.SkilledWorker,
        weeklyHours,
        $"{name.Replace(" ", ".").ToLowerInvariant()}@example.hu");

    private Absence CreateAbsence(EmployeeId employeeId, DateOnly start, DateOnly end, AbsenceStatus status)
    {
        var absence = Absence.Create(_tenantId, employeeId, AbsenceType.Vacation, start, end, "teszt");
        var approver = Guid.NewGuid();

        switch (status)
        {
            case AbsenceStatus.Pending:
                break;
            case AbsenceStatus.Approved:
                absence.Approve(approver);
                break;
            case AbsenceStatus.InProgress:
                absence.Approve(approver);
                absence.StartAbsence();
                break;
            case AbsenceStatus.Completed:
                absence.Approve(approver);
                absence.StartAbsence();
                absence.CompleteAbsence();
                break;
            case AbsenceStatus.Rejected:
                absence.Reject(approver, "nem most");
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(status));
        }

        return absence;
    }

    [Fact]
    public void Grid_HasOneRowPerEmployee_AndFiveWorkdays()
    {
        var employees = new[] { CreateEmployee("Kovács János", 40m), CreateEmployee("Nagy Éva", 20m) };

        var grid = _service.CalculateWeekGrid(employees, Monday, Array.Empty<Absence>());

        grid.Week.Should().Be(Monday);
        grid.Days.Should().HaveCount(5);
        grid.Days[0].Should().Be(Monday);
        grid.Days[4].Should().Be(Monday.AddDays(4)); // Friday
        grid.Rows.Should().HaveCount(2);
        grid.Rows.Should().OnlyContain(r => r.Days.Count == 5);
    }

    [Fact]
    public void FullTimeEmployee_NoAbsence_HasEightHoursPerDayAndFortyPerWeek()
    {
        var employee = CreateEmployee("Kovács János", 40m);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, Array.Empty<Absence>()).Rows[0];

        row.Days.Should().OnlyContain(d => d.Capacity == 8m && d.Workday && d.Free == 8m);
        row.Capacity.Should().Be(40m);
        // No Assignment aggregate yet: nothing is booked, so utilization is 0 (documented gap).
        row.Assigned.Should().Be(0m);
        row.Utilization.Should().Be(0m);
        row.Days.Should().OnlyContain(d => !d.Overloaded);
    }

    [Fact]
    public void PartTimeEmployee_GetsProportionalDailyCapacity()
    {
        var employee = CreateEmployee("Nagy Éva", 20m);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, Array.Empty<Absence>()).Rows[0];

        row.Days.Should().OnlyContain(d => d.Capacity == 4m);
        row.Capacity.Should().Be(20m);
    }

    [Theory]
    [InlineData(AbsenceStatus.Approved)]
    [InlineData(AbsenceStatus.InProgress)]
    [InlineData(AbsenceStatus.Completed)]
    public void BlockingAbsence_ZeroesTheDay_AndNamesTheAbsence(AbsenceStatus status)
    {
        var employee = CreateEmployee("Kovács János", 40m);
        var absence = CreateAbsence(employee.Id, Monday, Monday, status);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, new[] { absence }).Rows[0];

        var monday = row.Days[0];
        monday.Capacity.Should().Be(0m);
        monday.Free.Should().Be(0m);
        monday.Absence.Should().NotBeNull();
        monday.Absence!.Id.Should().Be(absence.Id);
        monday.Absence.Type.Should().Be(AbsenceType.Vacation);

        // Only Monday is blocked — the rest of the week keeps its capacity.
        row.Days[1].Capacity.Should().Be(8m);
        row.Capacity.Should().Be(32m);
    }

    [Theory]
    [InlineData(AbsenceStatus.Pending)]
    [InlineData(AbsenceStatus.Rejected)]
    public void NonBlockingAbsence_LeavesCapacityIntact(AbsenceStatus status)
    {
        var employee = CreateEmployee("Kovács János", 40m);
        var absence = CreateAbsence(employee.Id, Monday, Monday, status);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, new[] { absence }).Rows[0];

        row.Days[0].Capacity.Should().Be(8m);
        row.Days[0].Absence.Should().BeNull();
        row.Capacity.Should().Be(40m);
    }

    [Fact]
    public void MultiDayAbsence_BlocksEveryCoveredDay()
    {
        var employee = CreateEmployee("Kovács János", 40m);
        var absence = CreateAbsence(employee.Id, Monday, Monday.AddDays(2), AbsenceStatus.Approved);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, new[] { absence }).Rows[0];

        row.Days.Take(3).Should().OnlyContain(d => d.Capacity == 0m && d.Absence != null);
        row.Days.Skip(3).Should().OnlyContain(d => d.Capacity == 8m);
        row.Capacity.Should().Be(16m);
    }

    [Fact]
    public void AbsenceOfAnotherEmployee_DoesNotBlockThisRow()
    {
        var employee = CreateEmployee("Kovács János", 40m);
        var other = CreateEmployee("Nagy Éva", 40m);
        var absence = CreateAbsence(other.Id, Monday, Monday, AbsenceStatus.Approved);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, new[] { absence }).Rows[0];

        row.Capacity.Should().Be(40m);
    }

    [Fact]
    public void WholeWeekBlocked_UtilizationIsZero_NoDivisionByZero()
    {
        var employee = CreateEmployee("Kovács János", 40m);
        var absence = CreateAbsence(employee.Id, Monday, Monday.AddDays(4), AbsenceStatus.Approved);

        var row = _service.CalculateWeekGrid(new[] { employee }, Monday, new[] { absence }).Rows[0];

        row.Capacity.Should().Be(0m);
        row.Utilization.Should().Be(0m);
    }

    // ── Config-driven thresholds ────────────────────────────────────────────

    [Fact]
    public void ConfiguredWorkdaysPerWeek_DrivesGridWidthAndDailyCapacity()
    {
        var service = new CapacityCalculationService(new HrCapacityConfiguration(4, 0.01m, 0.85m));
        var employee = CreateEmployee("Kovács János", 40m);

        var grid = service.CalculateWeekGrid(new[] { employee }, Monday, Array.Empty<Absence>());

        grid.Days.Should().HaveCount(4);
        grid.Rows[0].Days.Should().OnlyContain(d => d.Capacity == 10m); // 40 / 4
    }

    [Fact]
    public void InvalidConfiguration_FailsFast()
    {
        var act = () => new HrCapacityConfiguration(0, 0.01m, 0.85m);

        act.Should().Throw<DomainException>().WithMessage("*WorkdaysPerWeek*");
    }

    [Fact]
    public void DefaultConfiguration_MirrorsThePortalConfig()
    {
        HrCapacityConfiguration.Default.WorkdaysPerWeek.Should().Be(5);
        HrCapacityConfiguration.Default.OverloadEpsilon.Should().Be(0.01m);
        HrCapacityConfiguration.Default.UtilizationWarnThreshold.Should().Be(0.85m);
    }
}
