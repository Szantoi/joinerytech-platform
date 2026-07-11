namespace SpaceOS.Modules.Kontrolling.Tests.Domain.Aggregates;

using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class ProjectCostCalculationTests
{
    [Fact]
    public void Calculate_ShouldComputeEACCorrectly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(48000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(12000, "HUF")),
            [CostCategory.Labor] = (new Money(15000, "HUF"), new Money(14000, "HUF")),
            [CostCategory.Overhead] = (new Money(5000, "HUF"), new Money(5000, "HUF"))
        };

        // Act
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 10);

        // Assert - EAC = MAX(planned, actual) per category
        calculation.TotalPlannedCost.Amount.Should().Be(30000); // 10k + 15k + 5k
        calculation.TotalActualCost.Amount.Should().Be(31000);  // 12k + 14k + 5k
        calculation.CostEAC.Amount.Should().Be(32000);          // MAX(12k, 10k) + MAX(14k, 15k) + MAX(5k, 5k) = 12k + 15k + 5k = 32k

        // Material category overspent
        var materialCost = calculation.GetCategoryCost(CostCategory.Material);
        materialCost.Should().NotBeNull();
        materialCost!.Projected.Amount.Should().Be(12000); // MAX(10000, 12000)
        materialCost.IsOverspent.Should().BeTrue();

        // Labor category under budget
        var laborCost = calculation.GetCategoryCost(CostCategory.Labor);
        laborCost.Should().NotBeNull();
        laborCost!.Projected.Amount.Should().Be(15000);    // MAX(15000, 14000)
        laborCost.IsUnderBudget.Should().BeTrue();
    }

    [Fact]
    public void Calculate_WithDirectCostPercentageOverhead_ShouldAllocateCorrectly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(10000, "HUF"))
        };

        // Act - 20% overhead on direct cost
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 20);

        // Assert
        calculation.Overhead.Amount.Should().Be(2000); // 10000 * 20% = 2000
    }

    [Fact]
    public void Calculate_WithLaborHoursOverhead_ShouldAllocateCorrectly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Labor] = (new Money(10000, "HUF"), new Money(10000, "HUF"))
        };

        // Act - 500 HUF per labor hour, 100 hours
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.LaborHours,
            overheadRate: 500,
            totalLaborHours: 100);

        // Assert
        calculation.Overhead.Amount.Should().Be(50000); // 100 hours * 500 HUF/hour
    }

    [Fact]
    public void Calculate_WithRevenueOverhead_ShouldAllocateCorrectly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(60000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(10000, "HUF"))
        };

        // Act - 15% overhead on actual revenue
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.Revenue,
            overheadRate: 15);

        // Assert
        calculation.Overhead.Amount.Should().Be(9000); // 60000 * 15% = 9000
    }

    [Fact]
    public void Calculate_ShouldComputeVarianceCorrectly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(12000, "HUF")),
            [CostCategory.Labor] = (new Money(15000, "HUF"), new Money(14000, "HUF"))
        };

        // Act
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 0);

        // Assert
        calculation.TotalVariance.Amount.Should().Be(1000); // (12000 + 14000) - (10000 + 15000) = 1000
        calculation.VariancePercentage.Should().BeApproximately(4m, 0.01m); // (1000 / 25000) * 100 = 4%
        calculation.IsOverBudget.Should().BeTrue();
        calculation.IsUnderBudget.Should().BeFalse();
    }

    [Fact]
    public void Calculate_ShouldComputeEACMarginCorrectly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(12000, "HUF")),
            [CostCategory.Labor] = (new Money(15000, "HUF"), new Money(16000, "HUF"))
        };

        // Act
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 0);

        // Assert
        // EAC = MAX(12k, 10k) + MAX(16k, 15k) = 12k + 16k = 28k
        // Margin = 50k - 28k = 22k, 44%
        calculation.CostEAC.Amount.Should().Be(28000);
        calculation.EACMargin.Amount.Amount.Should().Be(22000);
        calculation.EACMargin.Percentage.Should().Be(44);
        calculation.IsProfitable.Should().BeTrue();
    }

    [Fact]
    public void GetWorstPerformingCategory_ShouldReturnHighestOverspend()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(15000, "HUF")), // +5000
            [CostCategory.Labor] = (new Money(15000, "HUF"), new Money(18000, "HUF")),    // +3000
            [CostCategory.Logistics] = (new Money(5000, "HUF"), new Money(4000, "HUF"))   // -1000
        };

        // Act
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 0);

        var worst = calculation.GetWorstPerformingCategory();

        // Assert
        worst.Should().NotBeNull();
        worst!.Value.category.Should().Be(CostCategory.Material);
        worst.Value.cost.Variance.Amount.Should().Be(5000);
    }

    [Fact]
    public void GetBestPerformingCategory_ShouldReturnHighestUnderspend()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (new Money(10000, "HUF"), new Money(15000, "HUF")), // +5000
            [CostCategory.Labor] = (new Money(15000, "HUF"), new Money(13000, "HUF")),    // -2000
            [CostCategory.Logistics] = (new Money(5000, "HUF"), new Money(3000, "HUF"))   // -2000
        };

        // Act
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 0);

        var best = calculation.GetBestPerformingCategory();

        // Assert
        best.Should().NotBeNull();
        // Both Labor and Logistics have -2000 variance, should return first one found
        best!.Value.cost.Variance.Amount.Should().Be(-2000);
    }

    [Fact]
    public void Calculate_WithEmptyCostData_ShouldThrow()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var revenue = new Revenue(
            new Money(50000, "HUF"),
            new Money(50000, "HUF"));

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>();

        // Act & Assert
        var act = () => ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            overheadRate: 0);

        act.Should().Throw<ArgumentException>()
            .WithMessage("Cost data cannot be empty*");
    }
}
