using FluentAssertions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Services;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

public class VacationEntitlementServiceTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _facilityId = Guid.NewGuid();
    private readonly IVacationEntitlementService _service = new VacationEntitlementService();

    [Fact]
    public void CalculateEntitlement_NoChildren_ShouldReturnBaseDays()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(0);

        // Act
        var entitlement = _service.CalculateEntitlement(employee);

        // Assert
        entitlement.Base.Should().Be(20);
        entitlement.ChildExtra.Should().Be(0);
        entitlement.Total.Should().Be(20);
    }

    [Fact]
    public void CalculateEntitlement_OneChild_ShouldAddTwoDays()
    {
        // Arrange (Hungarian Labor Code Mt. §118)
        var employee = CreateEmployeeWithChildren(1);

        // Act
        var entitlement = _service.CalculateEntitlement(employee);

        // Assert
        entitlement.Base.Should().Be(20);
        entitlement.ChildExtra.Should().Be(2); // Mt. §118: 1 child = +2 days
        entitlement.Total.Should().Be(22);
    }

    [Fact]
    public void CalculateEntitlement_TwoChildren_ShouldAddFourDays()
    {
        // Arrange (Hungarian Labor Code Mt. §118)
        var employee = CreateEmployeeWithChildren(2);

        // Act
        var entitlement = _service.CalculateEntitlement(employee);

        // Assert
        entitlement.Base.Should().Be(20);
        entitlement.ChildExtra.Should().Be(4); // Mt. §118: 2 children = +4 days
        entitlement.Total.Should().Be(24);
    }

    [Fact]
    public void CalculateEntitlement_ThreeChildren_ShouldAddSevenDays()
    {
        // Arrange (Hungarian Labor Code Mt. §118)
        var employee = CreateEmployeeWithChildren(3);

        // Act
        var entitlement = _service.CalculateEntitlement(employee);

        // Assert
        entitlement.Base.Should().Be(20);
        entitlement.ChildExtra.Should().Be(7); // Mt. §118: 3+ children = +7 days
        entitlement.Total.Should().Be(27);
    }

    [Fact]
    public void CalculateEntitlement_FiveChildren_ShouldAddSevenDays()
    {
        // Arrange (Hungarian Labor Code Mt. §118 - cap at 7 days)
        var employee = CreateEmployeeWithChildren(5);

        // Act
        var entitlement = _service.CalculateEntitlement(employee);

        // Assert
        entitlement.Base.Should().Be(20);
        entitlement.ChildExtra.Should().Be(7); // Mt. §118: 3+ children = +7 days (max)
        entitlement.Total.Should().Be(27);
    }

    [Fact]
    public void CalculateEntitlement_NoPersonalData_ShouldReturnBaseDaysOnly()
    {
        // Arrange
        var employee = CreateEmployeeWithoutPersonalData();

        // Act
        var entitlement = _service.CalculateEntitlement(employee);

        // Assert
        entitlement.Base.Should().Be(20);
        entitlement.ChildExtra.Should().Be(0);
        entitlement.Total.Should().Be(20);
    }

    [Fact]
    public void CalculateBalance_NoAbsences_ShouldReturnFullEntitlement()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(2);
        var year = 2026;
        var absences = Array.Empty<Absence>();

        // Act
        var balance = _service.CalculateBalance(employee, year, absences);

        // Assert
        balance.EmployeeId.Should().Be(employee.Id);
        balance.Year.Should().Be(year);
        balance.Entitlement.Should().Be(24); // 20 base + 4 for 2 children
        balance.Base.Should().Be(20);
        balance.ChildExtra.Should().Be(4);
        balance.Used.Should().Be(0);
        balance.Remaining.Should().Be(24);
    }

    [Fact]
    public void CalculateBalance_WithApprovedVacation_ShouldDeductUsedDays()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(1);
        var year = 2026;
        var absence = CreateVacationAbsence(employee.Id, year, 5, AbsenceStatus.Approved);

        // Act
        var balance = _service.CalculateBalance(employee, year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(22); // 20 base + 2 for 1 child
        balance.Used.Should().Be(5);
        balance.Remaining.Should().Be(17);
    }

    [Fact]
    public void CalculateBalance_WithCompletedVacation_ShouldDeductUsedDays()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(0);
        var year = 2026;
        // Create 8-workday absence (June 1-8 = Mon-Fri + Mon-Tue-Wed, excludes Sat-Sun)
        var absence = CreateVacationAbsence(employee.Id, year, 8, AbsenceStatus.Completed);

        // Act
        var balance = _service.CalculateBalance(employee, year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(20);
        balance.Used.Should().Be(6); // June 1-8: Mon-Fri (5) + Mon (1) = 6 workdays
        balance.Remaining.Should().Be(14);
    }

    [Fact]
    public void CalculateBalance_WithPendingVacation_ShouldNotDeduct()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(1);
        var year = 2026;
        var absence = CreateVacationAbsence(employee.Id, year, 5, AbsenceStatus.Pending);

        // Act
        var balance = _service.CalculateBalance(employee, year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(22);
        balance.Used.Should().Be(0); // Pending should not count
        balance.Remaining.Should().Be(22);
    }

    [Fact]
    public void CalculateBalance_WithRejectedVacation_ShouldNotDeduct()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(1);
        var year = 2026;
        var absence = CreateVacationAbsence(employee.Id, year, 5, AbsenceStatus.Rejected);

        // Act
        var balance = _service.CalculateBalance(employee, year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(22);
        balance.Used.Should().Be(0); // Rejected should not count
        balance.Remaining.Should().Be(22);
    }

    [Fact]
    public void CalculateBalance_WithSickLeave_ShouldNotDeductFromVacation()
    {
        // Arrange
        var employee = CreateEmployeeWithChildren(0);
        var year = 2026;
        var absence = CreateSickLeaveAbsence(employee.Id, year, 5, AbsenceStatus.Approved);

        // Act
        var balance = _service.CalculateBalance(employee, year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(20);
        balance.Used.Should().Be(0); // Sick leave does not consume vacation days
        balance.Remaining.Should().Be(20);
    }

    [Fact]
    public void CalculateSickLeaveBalance_NoSickLeave_ShouldReturnFullEntitlement()
    {
        // Arrange (Hungarian Labor Code Mt. §123)
        var year = 2026;
        var absences = Array.Empty<Absence>();

        // Act
        var balance = _service.CalculateSickLeaveBalance(year, absences);

        // Assert
        balance.Year.Should().Be(year);
        balance.Entitlement.Should().Be(15); // Mt. §123: 15 days/year
        balance.Used.Should().Be(0);
        balance.Remaining.Should().Be(15);
    }

    [Fact]
    public void CalculateSickLeaveBalance_WithApprovedSickLeave_ShouldDeductUsedDays()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var year = 2026;
        var absence = CreateSickLeaveAbsence(employeeId, year, 5, AbsenceStatus.Approved);

        // Act
        var balance = _service.CalculateSickLeaveBalance(year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(15);
        balance.Used.Should().Be(5);
        balance.Remaining.Should().Be(10);
    }

    [Fact]
    public void CalculateSickLeaveBalance_WithVacation_ShouldNotDeduct()
    {
        // Arrange
        var employeeId = EmployeeId.New();
        var year = 2026;
        var absence = CreateVacationAbsence(employeeId, year, 5, AbsenceStatus.Approved);

        // Act
        var balance = _service.CalculateSickLeaveBalance(year, new[] { absence });

        // Assert
        balance.Entitlement.Should().Be(15);
        balance.Used.Should().Be(0); // Vacation does not consume sick leave
        balance.Remaining.Should().Be(15);
    }

    private Employee CreateEmployeeWithChildren(int children)
    {
        var payGrade = PayGrade.Create("Grade 5", 2500);
        var employee = Employee.Create(
            _tenantId,
            $"Employee {children}ch",
            "Operator",
            Department.Production,
            _facilityId,
            payGrade,
            40.0m,
            $"employee{children}@example.com");

        var personalData = PersonalData.Create(
            children,
            MaritalStatus.Married,
            new DateOnly(1985, 1, 1),
            "Test Birth Name",
            "Budapest",
            "Mother Name",
            "HU");

        employee.UpdatePersonal(personalData);

        return employee;
    }

    private Employee CreateEmployeeWithoutPersonalData()
    {
        var payGrade = PayGrade.Create("Grade 5", 2500);
        return Employee.Create(
            _tenantId,
            "No Personal Data",
            "Operator",
            Department.Production,
            _facilityId,
            payGrade,
            40.0m,
            "nopersonal@example.com");
    }

    private Absence CreateVacationAbsence(EmployeeId employeeId, int year, int workDays, AbsenceStatus status)
    {
        // 2026-06-01 is Monday, 2026-06-05 is Friday
        // Use this week for reliable workday calculation
        var startDate = new DateOnly(year, 6, 1); // Monday
        var endDate = startDate.AddDays(workDays - 1); // For Mon-Fri continuous

        var absence = Absence.Create(
            _tenantId,
            employeeId,
            AbsenceType.Vacation,
            startDate,
            endDate,
            "Test vacation");

        TransitionToStatus(absence, status);

        return absence;
    }

    private Absence CreateSickLeaveAbsence(EmployeeId employeeId, int year, int workDays, AbsenceStatus status)
    {
        // Same logic - 2026-06-01 is Monday
        var startDate = new DateOnly(year, 6, 1);
        var endDate = startDate.AddDays(workDays - 1);

        var absence = Absence.Create(
            _tenantId,
            employeeId,
            AbsenceType.SickLeave,
            startDate,
            endDate,
            "Test sick leave");

        TransitionToStatus(absence, status);

        return absence;
    }

    private void TransitionToStatus(Absence absence, AbsenceStatus status)
    {
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
    }
}
