namespace SpaceOS.Modules.Kontrolling.Tests.Domain.ValueObjects;

using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class MarginTests
{
    [Fact]
    public void Calculate_WithProfit_ShouldReturnPositiveMargin()
    {
        // Arrange
        var revenue = new Money(10000, "HUF");
        var cost = new Money(7000, "HUF");

        // Act
        var margin = Margin.Calculate(revenue, cost);

        // Assert
        margin.Amount.Amount.Should().Be(3000);        // 10000 - 7000
        margin.Percentage.Should().Be(30);             // (3000 / 10000) * 100
        margin.IsProfitable.Should().BeTrue();
        margin.IsLoss.Should().BeFalse();
    }

    [Fact]
    public void Calculate_WithLoss_ShouldReturnNegativeMargin()
    {
        // Arrange
        var revenue = new Money(5000, "HUF");
        var cost = new Money(7000, "HUF");

        // Act
        var margin = Margin.Calculate(revenue, cost);

        // Assert
        margin.Amount.Amount.Should().Be(-2000);       // 5000 - 7000
        margin.Percentage.Should().Be(-40);            // (-2000 / 5000) * 100
        margin.IsProfitable.Should().BeFalse();
        margin.IsLoss.Should().BeTrue();
    }

    [Fact]
    public void Calculate_WithBreakEven_ShouldReturnZeroMargin()
    {
        // Arrange
        var revenue = new Money(5000, "HUF");
        var cost = new Money(5000, "HUF");

        // Act
        var margin = Margin.Calculate(revenue, cost);

        // Assert
        margin.Amount.Amount.Should().Be(0);
        margin.Percentage.Should().Be(0);
        margin.IsProfitable.Should().BeFalse();
        margin.IsLoss.Should().BeFalse();
    }

    [Fact]
    public void Calculate_WithZeroRevenue_ShouldReturnZeroPercentage()
    {
        // Arrange
        var revenue = new Money(0, "HUF");
        var cost = new Money(1000, "HUF");

        // Act
        var margin = Margin.Calculate(revenue, cost);

        // Assert
        margin.Amount.Amount.Should().Be(-1000);
        margin.Percentage.Should().Be(0);              // Avoid division by zero
        margin.IsLoss.Should().BeTrue();
    }

    [Fact]
    public void Calculate_DifferentCurrencies_ShouldThrow()
    {
        // Arrange
        var revenue = new Money(10000, "HUF");
        var cost = new Money(7000, "EUR");

        // Act & Assert
        var act = () => Margin.Calculate(revenue, cost);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Currency mismatch: HUF vs EUR");
    }

    [Fact]
    public void Zero_ShouldCreateZeroMargin()
    {
        // Act
        var margin = Margin.Zero("HUF");

        // Assert
        margin.Amount.Amount.Should().Be(0);
        margin.Amount.Currency.Should().Be("HUF");
        margin.Percentage.Should().Be(0);
    }

    [Theory]
    [InlineData(10000, 6000, 4000, 40, true, false)]   // 40% profit
    [InlineData(10000, 10000, 0, 0, false, false)]     // Break-even
    [InlineData(10000, 12000, -2000, -20, false, true)] // 20% loss
    [InlineData(5000, 3000, 2000, 40, true, false)]    // 40% profit
    public void Calculate_VariousScenarios_ShouldReturnCorrectMargin(
        decimal revenue,
        decimal cost,
        decimal expectedAmount,
        decimal expectedPercentage,
        bool expectedProfitable,
        bool expectedLoss)
    {
        // Act
        var margin = Margin.Calculate(
            new Money(revenue, "HUF"),
            new Money(cost, "HUF"));

        // Assert
        margin.Amount.Amount.Should().Be(expectedAmount);
        margin.Percentage.Should().Be(expectedPercentage);
        margin.IsProfitable.Should().Be(expectedProfitable);
        margin.IsLoss.Should().Be(expectedLoss);
    }
}
