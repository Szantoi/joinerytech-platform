namespace SpaceOS.Modules.Kontrolling.Tests.Domain.ValueObjects;

using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class MoneyTests
{
    [Fact]
    public void Zero_ShouldCreateZeroMoney()
    {
        // Act
        var money = Money.Zero("HUF");

        // Assert
        money.Amount.Should().Be(0);
        money.Currency.Should().Be("HUF");
        money.IsZero.Should().BeTrue();
    }

    [Fact]
    public void Add_SameCurrency_ShouldSucceed()
    {
        // Arrange
        var money1 = new Money(100, "HUF");
        var money2 = new Money(50, "HUF");

        // Act
        var result = money1.Add(money2);

        // Assert
        result.Amount.Should().Be(150);
        result.Currency.Should().Be("HUF");
    }

    [Fact]
    public void Add_DifferentCurrency_ShouldThrow()
    {
        // Arrange
        var money1 = new Money(100, "HUF");
        var money2 = new Money(50, "EUR");

        // Act & Assert
        var act = () => money1.Add(money2);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot add HUF and EUR");
    }

    [Fact]
    public void Subtract_ShouldReturnCorrectResult()
    {
        // Arrange
        var money1 = new Money(100, "HUF");
        var money2 = new Money(30, "HUF");

        // Act
        var result = money1.Subtract(money2);

        // Assert
        result.Amount.Should().Be(70);
        result.Currency.Should().Be("HUF");
    }

    [Fact]
    public void Multiply_ShouldReturnCorrectResult()
    {
        // Arrange
        var money = new Money(100, "HUF");

        // Act
        var result = money.Multiply(2.5m);

        // Assert
        result.Amount.Should().Be(250);
        result.Currency.Should().Be("HUF");
    }

    [Fact]
    public void Divide_ShouldReturnCorrectResult()
    {
        // Arrange
        var money = new Money(100, "HUF");

        // Act
        var result = money.Divide(4);

        // Assert
        result.Amount.Should().Be(25);
        result.Currency.Should().Be("HUF");
    }

    [Fact]
    public void Divide_ByZero_ShouldThrow()
    {
        // Arrange
        var money = new Money(100, "HUF");

        // Act & Assert
        var act = () => money.Divide(0);
        act.Should().Throw<DivideByZeroException>();
    }

    [Fact]
    public void IsPositive_ShouldReturnTrueForPositiveAmount()
    {
        // Arrange
        var money = new Money(100, "HUF");

        // Assert
        money.IsPositive.Should().BeTrue();
        money.IsNegative.Should().BeFalse();
        money.IsZero.Should().BeFalse();
    }

    [Fact]
    public void IsNegative_ShouldReturnTrueForNegativeAmount()
    {
        // Arrange
        var money = new Money(-100, "HUF");

        // Assert
        money.IsNegative.Should().BeTrue();
        money.IsPositive.Should().BeFalse();
        money.IsZero.Should().BeFalse();
    }

    [Theory]
    [InlineData(100, 50, 150)]
    [InlineData(-50, 30, -20)]
    [InlineData(0, 100, 100)]
    public void OperatorAdd_ShouldWork(decimal amount1, decimal amount2, decimal expected)
    {
        // Arrange
        var money1 = new Money(amount1, "HUF");
        var money2 = new Money(amount2, "HUF");

        // Act
        var result = money1 + money2;

        // Assert
        result.Amount.Should().Be(expected);
    }

    [Theory]
    [InlineData(100, 50, 50)]
    [InlineData(-50, 30, -80)]
    [InlineData(0, 100, -100)]
    public void OperatorSubtract_ShouldWork(decimal amount1, decimal amount2, decimal expected)
    {
        // Arrange
        var money1 = new Money(amount1, "HUF");
        var money2 = new Money(amount2, "HUF");

        // Act
        var result = money1 - money2;

        // Assert
        result.Amount.Should().Be(expected);
    }

    [Fact]
    public void OperatorMultiply_ShouldWork()
    {
        // Arrange
        var money = new Money(50, "HUF");

        // Act
        var result = money * 3;

        // Assert
        result.Amount.Should().Be(150);
    }

    [Fact]
    public void OperatorDivide_ShouldWork()
    {
        // Arrange
        var money = new Money(100, "HUF");

        // Act
        var result = money / 4;

        // Assert
        result.Amount.Should().Be(25);
    }

    [Fact]
    public void FromHUF_ShouldCreateHUFMoney()
    {
        // Act
        var money = Money.FromHUF(1000);

        // Assert
        money.Amount.Should().Be(1000);
        money.Currency.Should().Be("HUF");
    }
}
