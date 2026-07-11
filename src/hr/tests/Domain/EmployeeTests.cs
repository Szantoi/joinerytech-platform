using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Events;
using SpaceOS.Modules.HR.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

public class EmployeeTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _facilityId = Guid.NewGuid();

    [Fact]
    public void Create_ValidEmployee_ShouldSucceed()
    {
        // Arrange & Act
        var payGrade = PayGrade.Create("Grade 5", 2500);
        var employee = Employee.Create(
            _tenantId,
            "János Kovács",
            "CNC Operator",
            Department.Production,
            _facilityId,
            payGrade,
            40.0m,
            "janos.kovacs@example.com");

        // Assert
        employee.Should().NotBeNull();
        employee.Name.Should().Be("János Kovács");
        employee.Initials.Should().Be("JK");
        employee.WeeklyHours.Should().Be(40.0m);
        employee.Active.Should().BeTrue();
        employee.VacationBase.Should().Be(20);
        
        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeeCreatedEvent>();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidName_ShouldThrow(string? invalidName)
    {
        var payGrade = PayGrade.Create("Grade 5", 2500);

        var act = () => Employee.Create(
            _tenantId,
            invalidName!,
            "Role",
            Department.Production,
            _facilityId,
            payGrade,
            40.0m,
            "test@example.com");

        act.Should().Throw<DomainException>()
            .WithMessage("Employee name is required");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(169)]
    public void Create_WithInvalidWeeklyHours_ShouldThrow(decimal invalidHours)
    {
        var payGrade = PayGrade.Create("Grade 5", 2500);

        var act = () => Employee.Create(
            _tenantId,
            "Test Name",
            "Role",
            Department.Production,
            _facilityId,
            payGrade,
            invalidHours,
            "test@example.com");

        act.Should().Throw<DomainException>()
            .WithMessage("Weekly hours must be between 0 and 168");
    }

    [Fact]
    public void AddSkill_NewSkill_ShouldAddSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.AddSkill(SkillKey.Welding, SkillLevel.Intermediate);

        // Assert
        employee.Skills.Should().HaveCount(1);
        employee.Skills.First().Key.Should().Be(SkillKey.Welding);
        employee.Skills.First().Level.Should().Be(SkillLevel.Intermediate);

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeeSkillAddedEvent>();
    }

    [Fact]
    public void AddSkill_DuplicateSkill_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.AddSkill(SkillKey.Welding, SkillLevel.Beginner);

        // Act
        var act = () => employee.AddSkill(SkillKey.Welding, SkillLevel.Advanced);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Employee already has skill *");
    }

    [Fact]
    public void UpdateSkill_ExistingSkill_ShouldUpdateSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.AddSkill(SkillKey.Welding, SkillLevel.Beginner);
        employee.ClearDomainEvents();

        // Act
        employee.UpdateSkill(SkillKey.Welding, SkillLevel.Advanced);

        // Assert
        employee.Skills.Should().HaveCount(1);
        employee.Skills.First().Level.Should().Be(SkillLevel.Advanced);

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeeSkillUpdatedEvent>();
    }

    [Fact]
    public void UpdateSkill_NonExistingSkill_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.UpdateSkill(SkillKey.Welding, SkillLevel.Advanced);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Skill * not found");
    }

    [Fact]
    public void RemoveSkill_ExistingSkill_ShouldRemoveSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.AddSkill(SkillKey.Welding, SkillLevel.Beginner);
        employee.ClearDomainEvents();

        // Act
        employee.RemoveSkill(SkillKey.Welding);

        // Assert
        employee.Skills.Should().BeEmpty();

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeeSkillRemovedEvent>();
    }

    [Fact]
    public void RemoveSkill_NonExistingSkill_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.RemoveSkill(SkillKey.Welding);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Skill * not found");
    }

    [Fact]
    public void UpdatePersonal_ValidData_ShouldUpdateSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();
        var personalData = PersonalData.Create(
            2,
            MaritalStatus.Married,
            new DateOnly(1985, 5, 15),
            "Kovács János",
            "Budapest",
            "Nagy Mária",
            "HU");

        // Act
        employee.UpdatePersonal(personalData);

        // Assert
        employee.Personal.Should().NotBeNull();
        employee.Personal!.Children.Should().Be(2);

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeePersonalDataUpdatedEvent>();
    }

    [Fact]
    public void PromoteToPayGrade_ValidGrade_ShouldPromoteSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();
        var newGrade = PayGrade.Create("Grade 10", 5000);

        // Act
        employee.PromoteToPayGrade(newGrade);

        // Assert
        employee.PayGrade.Name.Should().Be("Grade 10");
        employee.PayGrade.HourlyRate.Should().Be(5000);

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeePromotedEvent>();
    }

    [Fact]
    public void Deactivate_ActiveEmployee_ShouldDeactivateSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.Deactivate();

        // Assert
        employee.Active.Should().BeFalse();

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeeDeactivatedEvent>();
    }

    [Fact]
    public void Deactivate_AlreadyDeactivated_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.Deactivate();

        // Act
        var act = () => employee.Deactivate();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Employee is already deactivated");
    }

    [Fact]
    public void Reactivate_DeactivatedEmployee_ShouldReactivateSuccessfully()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.Deactivate();
        employee.ClearDomainEvents();

        // Act
        employee.Reactivate();

        // Assert
        employee.Active.Should().BeTrue();

        var events = employee.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<EmployeeReactivatedEvent>();
    }

    [Fact]
    public void Reactivate_AlreadyActive_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.Reactivate();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Employee is already active");
    }

    [Theory]
    [InlineData("János Kovács", "JK")]
    [InlineData("Smith", "S")]
    [InlineData("John Michael Smith", "JM")]
    public void Create_GeneratesCorrectInitials(string name, string expectedInitials)
    {
        // Arrange & Act
        var payGrade = PayGrade.Create("Grade 5", 2500);
        var employee = Employee.Create(
            _tenantId,
            name,
            "Role",
            Department.Production,
            _facilityId,
            payGrade,
            40.0m,
            "test@example.com");

        // Assert
        employee.Initials.Should().Be(expectedInitials);
    }

    private Employee CreateTestEmployee()
    {
        var payGrade = PayGrade.Create("Grade 5", 2500);
        return Employee.Create(
            _tenantId,
            "Test Employee",
            "Operator",
            Department.Production,
            _facilityId,
            payGrade,
            40.0m,
            "test@example.com");
    }
}
