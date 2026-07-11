using FluentAssertions;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Services;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Domain;

public class MaintenanceCostEstimatorServiceTests
{
    private readonly MaintenanceCostEstimatorService _service = new();
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly AssetId _assetId = AssetId.New();

    [Fact]
    public void EstimateCost_WithNoParts_ShouldReturnLaborCostOnly()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Preventive,
            WorkOrderPriority.Medium,
            "Oil change",
            "Scheduled oil change",
            estimatedHours: 2.0m);

        var hourlyRate = 5000m; // 5000 HUF/hour

        // Act
        var cost = _service.EstimateCost(wo, hourlyRate);

        // Assert
        cost.Amount.Should().Be(10000m); // 2 hours * 5000 HUF
        cost.Currency.Should().Be("HUF");
    }

    [Fact]
    public void EstimateCost_WithParts_ShouldIncludePartsCost()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Replace belt",
            "Belt replacement",
            estimatedHours: 3.0m);

        wo.AddPart("BELT-V-001", 2, Money.Create(8000m, "HUF")); // 2 x 8000 = 16000
        wo.AddPart("BEARING-001", 4, Money.Create(3000m, "HUF")); // 4 x 3000 = 12000

        var hourlyRate = 6000m;

        // Act
        var cost = _service.EstimateCost(wo, hourlyRate);

        // Assert
        // Parts: 16000 + 12000 = 28000
        // Labor: 3 hours * 6000 = 18000
        // Total: 46000
        cost.Amount.Should().Be(46000m);
        cost.Currency.Should().Be("HUF");
    }

    [Fact]
    public void EstimateCost_WithNoEstimatedHours_ShouldReturnPartsCostOnly()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.High,
            "Replace belt",
            "Belt replacement");
            // No estimated hours

        wo.AddPart("BELT-V-001", 1, Money.Create(10000m, "HUF"));

        var hourlyRate = 6000m;

        // Act
        var cost = _service.EstimateCost(wo, hourlyRate);

        // Assert
        // Parts: 10000
        // Labor: 0 hours * 6000 = 0
        // Total: 10000
        cost.Amount.Should().Be(10000m);
        cost.Currency.Should().Be("HUF");
    }

    [Fact]
    public void EstimateCost_WithZeroHourlyRate_ShouldReturnPartsCostOnly()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Cleaning,
            WorkOrderPriority.Low,
            "Clean machine",
            "Deep cleaning",
            estimatedHours: 4.0m);

        wo.AddPart("CLEANER-001", 2, Money.Create(2000m, "HUF"));

        var hourlyRate = 0m; // No labor cost

        // Act
        var cost = _service.EstimateCost(wo, hourlyRate);

        // Assert
        // Parts: 2 * 2000 = 4000
        // Labor: 4 * 0 = 0
        // Total: 4000
        cost.Amount.Should().Be(4000m);
        cost.Currency.Should().Be("HUF");
    }

    [Fact]
    public void EstimateCost_WithNoPartsAndNoHours_ShouldReturnZero()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Preventive,
            WorkOrderPriority.Low,
            "Inspection",
            "Visual inspection only");
            // No estimated hours, no parts

        var hourlyRate = 5000m;

        // Act
        var cost = _service.EstimateCost(wo, hourlyRate);

        // Assert
        cost.Amount.Should().Be(0m);
        cost.Currency.Should().Be("HUF");
    }

    [Fact]
    public void EstimateCost_WithMultipleParts_ShouldSumCorrectly()
    {
        // Arrange
        var wo = WorkOrder.Create(
            _tenantId,
            _assetId,
            WorkOrderType.Corrective,
            WorkOrderPriority.Critical,
            "Full overhaul",
            "Complete machine overhaul",
            estimatedHours: 12.0m);

        wo.AddPart("PART-001", 5, Money.Create(1000m, "HUF"));   // 5000
        wo.AddPart("PART-002", 10, Money.Create(500m, "HUF"));   // 5000
        wo.AddPart("PART-003", 2, Money.Create(15000m, "HUF")); // 30000

        var hourlyRate = 7000m;

        // Act
        var cost = _service.EstimateCost(wo, hourlyRate);

        // Assert
        // Parts: 5000 + 5000 + 30000 = 40000
        // Labor: 12 * 7000 = 84000
        // Total: 124000
        cost.Amount.Should().Be(124000m);
        cost.Currency.Should().Be("HUF");
    }
}
