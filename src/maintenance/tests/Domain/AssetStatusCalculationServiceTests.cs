using FluentAssertions;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Services;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Domain;

public class AssetStatusCalculationServiceTests
{
    private readonly AssetStatusCalculationService _service = new();
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _facilityId = Guid.NewGuid();

    [Fact]
    public void GetAssetStatus_ForOperationalAsset_ShouldReturnOperational()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        var workOrders = new List<WorkOrder>();

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Operational);
    }

    [Fact]
    public void GetAssetStatus_ForRetiredAsset_ShouldReturnRetired()
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

        var workOrders = new List<WorkOrder>();

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Retired);
    }

    [Fact]
    public void GetAssetStatus_WithInProgressCorrectiveDowntime_ShouldReturnBreakdown()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        var wo = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Corrective,
            WorkOrderPriority.Critical,
            "Fix broken motor",
            "Motor failure",
            requiresDowntime: true);
        wo.Schedule(DateTime.UtcNow.AddDays(1), 4.0m);
        wo.AssignInternalTechnician(Guid.NewGuid());
        wo.StartWork();

        var workOrders = new List<WorkOrder> { wo };

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Breakdown);
    }

    [Fact]
    public void GetAssetStatus_WithInProgressPreventiveDowntime_ShouldReturnMaintenance()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        var wo = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Preventive,
            WorkOrderPriority.Medium,
            "Oil change",
            "Scheduled oil change",
            requiresDowntime: true);
        wo.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo.AssignInternalTechnician(Guid.NewGuid());
        wo.StartWork();

        var workOrders = new List<WorkOrder> { wo };

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Maintenance);
    }

    [Fact]
    public void GetAssetStatus_WithInProgressCleaningDowntime_ShouldReturnMaintenance()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        var wo = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Cleaning,
            WorkOrderPriority.Low,
            "Deep clean",
            "Annual deep cleaning",
            requiresDowntime: true);
        wo.Schedule(DateTime.UtcNow.AddDays(1), 3.0m);
        wo.AssignExternalContractor(Guid.NewGuid());
        wo.StartWork();

        var workOrders = new List<WorkOrder> { wo };

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Maintenance);
    }

    [Fact]
    public void GetAssetStatus_WithInProgressNoDowntime_ShouldReturnOperational()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        var wo = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Preventive,
            WorkOrderPriority.Medium,
            "Inspection",
            "Visual inspection only",
            requiresDowntime: false); // No downtime required
        wo.Schedule(DateTime.UtcNow.AddDays(1), 0.5m);
        wo.AssignInternalTechnician(Guid.NewGuid());
        wo.StartWork();

        var workOrders = new List<WorkOrder> { wo };

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Operational);
    }

    [Fact]
    public void GetAssetStatus_WithCompletedWorkOrder_ShouldReturnOperational()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        var wo = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Fix motor",
            "Motor fixed",
            requiresDowntime: true);
        wo.Schedule(DateTime.UtcNow.AddDays(1), 4.0m);
        wo.AssignInternalTechnician(Guid.NewGuid());
        wo.StartWork();
        wo.Complete(5.0m); // Completed

        var workOrders = new List<WorkOrder> { wo };

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        status.Should().Be(AssetStatus.Operational);
    }

    [Fact]
    public void GetAssetStatus_WithMultipleInProgressPreferBreakdown_ShouldReturnBreakdown()
    {
        // Arrange
        var asset = Asset.Create(
            _tenantId,
            "CNC-001",
            "CNC Machine",
            AssetKind.Machine,
            _facilityId,
            "Workshop");

        // One preventive maintenance
        var wo1 = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Preventive,
            WorkOrderPriority.Medium,
            "Oil change",
            "Scheduled maintenance",
            requiresDowntime: true);
        wo1.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        wo1.AssignInternalTechnician(Guid.NewGuid());
        wo1.StartWork();

        // One corrective (breakdown)
        var wo2 = WorkOrder.Create(
            _tenantId,
            asset.Id,
            WorkOrderType.Corrective,
            WorkOrderPriority.Critical,
            "Fix belt",
            "Belt snapped",
            requiresDowntime: true);
        wo2.Schedule(DateTime.UtcNow.AddDays(1), 3.0m);
        wo2.AssignInternalTechnician(Guid.NewGuid());
        wo2.StartWork();

        var workOrders = new List<WorkOrder> { wo1, wo2 };

        // Act
        var status = _service.GetAssetStatus(asset, workOrders);

        // Assert
        // Breakdown takes precedence over Maintenance
        status.Should().Be(AssetStatus.Breakdown);
    }
}
