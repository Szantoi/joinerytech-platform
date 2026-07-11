using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Events;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Domain;

public class AssetTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _facilityId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateValidAsset()
    {
        // Arrange & Act
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Lathe Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop Floor A");

        // Assert
        asset.Should().NotBeNull();
        asset.Code.Should().Be("CNC-001");
        asset.Name.Should().Be("CNC Lathe Machine");
        asset.Kind.Should().Be(AssetKind.Machine);
        asset.FacilityId.Should().Be(_facilityId);
        asset.Location.Should().Be("Workshop Floor A");
        asset.OperatingHours.Should().Be(0);
        asset.Retired.Should().BeFalse();

        var domainEvents = asset.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<AssetCreatedEvent>();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidCode_ShouldThrow(string? invalidCode)
    {
        // Act
        var act = () => Asset.Create(
            _tenantId,
            invalidCode!,
            "Valid Name",
            AssetKind.Machine,
            _facilityId,
            "Valid Location");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Asset code is required");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidName_ShouldThrow(string? invalidName)
    {
        // Act
        var act = () => Asset.Create(
            _tenantId,
            "CODE-001",
            invalidName!,
            AssetKind.Machine,
            _facilityId,
            "Valid Location");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Asset name is required");
    }

    [Fact]
    public void RecordOperatingHours_ShouldIncrementHours()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.RecordOperatingHours(10.5m);

        // Assert
        asset.OperatingHours.Should().Be(10.5m);

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        var hoursEvent = events.First() as AssetOperatingHoursRecordedEvent;
        hoursEvent.Should().NotBeNull();
        hoursEvent!.HoursAdded.Should().Be(10.5m);
        hoursEvent.TotalHours.Should().Be(10.5m);
    }

    [Fact]
    public void RecordOperatingHours_WithNegativeHours_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        // Act
        var act = () => asset.RecordOperatingHours(-5);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Operating hours must be positive");
    }

    [Fact]
    public void RecordOperatingHours_ForRetiredAsset_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        asset.Retire();

        // Act
        var act = () => asset.RecordOperatingHours(10);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot record operating hours for retired assets");
    }

    [Theory]
    [InlineData(AssetKind.Tool)]
    [InlineData(AssetKind.Infrastructure)]
    [InlineData(AssetKind.IT)]
    [InlineData(AssetKind.Room)]
    public void RecordOperatingHours_ForNonMachineOrVehicle_ShouldThrow(AssetKind kind)
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "TOOL-001",
            "Tool",
            kind,
            _facilityId,
            "Workshop");

        // Act
        var act = () => asset.RecordOperatingHours(10);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Operating hours can only be recorded for Machine or Vehicle assets, not {kind}");
    }

    [Fact]
    public void Retire_ShouldSetRetiredFlag()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.Retire();

        // Assert
        asset.Retired.Should().BeTrue();

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AssetRetiredEvent>();
    }

    [Fact]
    public void Retire_AlreadyRetired_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        asset.Retire();

        // Act
        var act = () => asset.Retire();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Asset is already retired");
    }

    [Fact]
    public void Reactivate_ShouldClearRetiredFlag()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        asset.Retire();
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.Reactivate();

        // Assert
        asset.Retired.Should().BeFalse();

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<AssetReactivatedEvent>();
    }

    [Fact]
    public void Reactivate_NotRetired_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        // Act
        var act = () => asset.Reactivate();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Asset is not retired");
    }

    [Fact]
    public void AddMaintenancePlan_ShouldAddPlan()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            Guid.NewGuid());
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.AddMaintenancePlan(plan);

        // Assert
        asset.MaintenancePlans.Should().HaveCount(1);
        asset.MaintenancePlans.First().Label.Should().Be("Monthly oil change");

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        var planEvent = events.First() as MaintenancePlanAddedEvent;
        planEvent.Should().NotBeNull();
        planEvent!.PlanLabel.Should().Be("Monthly oil change");
    }

    [Fact]
    public void AddMaintenancePlan_DuplicateId_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        var plan1 = MaintenancePlan.CreateIntervalBased(
            "Plan 1",
            30,
            2.0m,
            AssignmentType.Internal,
            Guid.NewGuid());
        asset.AddMaintenancePlan(plan1);

        // Try to add same plan again (same ID)
        var act = () => asset.AddMaintenancePlan(plan1);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Maintenance plan with ID '{plan1.Id}' already exists");
    }

    [Fact]
    public void RemoveMaintenancePlan_ShouldRemovePlan()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        var plan = MaintenancePlan.CreateIntervalBased(
            "Monthly oil change",
            30,
            2.0m,
            AssignmentType.Internal,
            Guid.NewGuid());
        asset.AddMaintenancePlan(plan);
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.RemoveMaintenancePlan(plan.Id);

        // Assert
        asset.MaintenancePlans.Should().BeEmpty();

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        events.First().Should().BeOfType<MaintenancePlanRemovedEvent>();
    }

    [Fact]
    public void LinkToMachine_ForMachineAsset_ShouldLinkSuccessfully()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.LinkToMachine("machine-uuid-123");

        // Assert
        asset.MachineId.Should().Be("machine-uuid-123");

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        var linkEvent = events.First() as AssetLinkedToMachineEvent;
        linkEvent.Should().NotBeNull();
        linkEvent!.MachineId.Should().Be("machine-uuid-123");
    }

    [Fact]
    public void LinkToMachine_ForNonMachineAsset_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "VAN-001",
            "Delivery Van",
            AssetKind.Vehicle,
            _facilityId,
            "Parking");

        // Act
        var act = () => asset.LinkToMachine("machine-uuid-123");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Only Machine assets can be linked to Production machines, current kind is Vehicle");
    }

    [Fact]
    public void LinkToVehicle_ForVehicleAsset_ShouldLinkSuccessfully()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "VAN-001",
            "Delivery Van",
            AssetKind.Vehicle,
            _facilityId,
            "Parking");
        asset.ClearDomainEvents(); // Clear initial events

        // Act
        asset.LinkToVehicle("vehicle-uuid-456");

        // Assert
        asset.VehicleId.Should().Be("vehicle-uuid-456");

        var events = asset.GetDomainEvents();
        events.Should().HaveCount(1);
        var linkEvent = events.First() as AssetLinkedToVehicleEvent;
        linkEvent.Should().NotBeNull();
        linkEvent!.VehicleId.Should().Be("vehicle-uuid-456");
    }

    [Fact]
    public void LinkToVehicle_ForNonVehicleAsset_ShouldThrow()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        // Act
        var act = () => asset.LinkToVehicle("vehicle-uuid-456");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Only Vehicle assets can be linked to Logistics vehicles, current kind is Machine");
    }
}
