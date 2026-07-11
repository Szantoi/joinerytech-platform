namespace SpaceOS.Modules.Kontrolling.Tests.Domain.ValueObjects;

using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class CategoryCostTests
{
    [Fact]
    public void Calculate_ActualGreaterThanPlanned_ProjectedShouldBeActual()
    {
        // Arrange - EAC formula: projected = MAX(planned, actual)
        var planned = new Money(1000, "HUF");
        var actual = new Money(1200, "HUF");

        // Act
        var categoryCost = CategoryCost.Calculate(planned, actual);

        // Assert
        categoryCost.Planned.Amount.Should().Be(1000);
        categoryCost.Actual.Amount.Should().Be(1200);
        categoryCost.Projected.Amount.Should().Be(1200); // MAX(1000, 1200) = 1200
        categoryCost.Variance.Amount.Should().Be(200);   // 1200 - 1000
        categoryCost.IsOverspent.Should().BeTrue();
        categoryCost.IsUnderBudget.Should().BeFalse();
    }

    [Fact]
    public void Calculate_PlannedGreaterThanActual_ProjectedShouldBePlanned()
    {
        // Arrange
        var planned = new Money(1000, "HUF");
        var actual = new Money(800, "HUF");

        // Act
        var categoryCost = CategoryCost.Calculate(planned, actual);

        // Assert
        categoryCost.Planned.Amount.Should().Be(1000);
        categoryCost.Actual.Amount.Should().Be(800);
        categoryCost.Projected.Amount.Should().Be(1000); // MAX(1000, 800) = 1000
        categoryCost.Variance.Amount.Should().Be(-200);  // 800 - 1000
        categoryCost.IsUnderBudget.Should().BeTrue();
        categoryCost.IsOverspent.Should().BeFalse();
    }

    [Fact]
    public void Calculate_ActualEqualsPlanned_ProjectedShouldBeActual()
    {
        // Arrange
        var planned = new Money(1000, "HUF");
        var actual = new Money(1000, "HUF");

        // Act
        var categoryCost = CategoryCost.Calculate(planned, actual);

        // Assert
        categoryCost.Planned.Amount.Should().Be(1000);
        categoryCost.Actual.Amount.Should().Be(1000);
        categoryCost.Projected.Amount.Should().Be(1000);
        categoryCost.Variance.Amount.Should().Be(0);
        categoryCost.IsOverspent.Should().BeFalse();
        categoryCost.IsUnderBudget.Should().BeFalse();
    }

    [Fact]
    public void Zero_ShouldCreateZeroCategoryCost()
    {
        // Act
        var categoryCost = CategoryCost.Zero("HUF");

        // Assert
        categoryCost.Planned.Amount.Should().Be(0);
        categoryCost.Actual.Amount.Should().Be(0);
        categoryCost.Projected.Amount.Should().Be(0);
        categoryCost.Variance.Amount.Should().Be(0);
    }

    [Theory]
    [InlineData(1000, 1500, 500, true, false)]  // Overspent
    [InlineData(1000, 800, -200, false, true)]  // Under budget
    [InlineData(1000, 1000, 0, false, false)]   // On budget
    public void IsOverspent_IsUnderBudget_ShouldReflectVariance(
        decimal planned,
        decimal actual,
        decimal expectedVariance,
        bool expectedOverspent,
        bool expectedUnderBudget)
    {
        // Arrange
        var categoryCost = CategoryCost.Calculate(
            new Money(planned, "HUF"),
            new Money(actual, "HUF"));

        // Assert
        categoryCost.Variance.Amount.Should().Be(expectedVariance);
        categoryCost.IsOverspent.Should().Be(expectedOverspent);
        categoryCost.IsUnderBudget.Should().Be(expectedUnderBudget);
    }
}
