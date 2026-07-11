namespace SpaceOS.Modules.Kontrolling.Tests.Application.Validators;

using FluentAssertions;
using FluentValidation.TestHelper;
using SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using Xunit;

public sealed class SetOverheadConfigCommandValidatorTests
{
    private readonly SetOverheadConfigCommandValidator _validator;

    public SetOverheadConfigCommandValidatorTests()
    {
        _validator = new SetOverheadConfigCommandValidator();
    }

    [Fact]
    public void Validate_WithValidCommand_ShouldPass()
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.DirectCostPercentage,
            0.15m,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WithEmptyTenantId_ShouldFail()
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.Empty,
            OverheadAllocationMethod.LaborHours,
            5000m,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.TenantId)
            .WithErrorMessage("TenantId is required");
    }

    [Fact]
    public void Validate_WithEmptyUpdatedBy_ShouldFail()
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.Revenue,
            0.1m,
            Guid.Empty
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.UpdatedBy)
            .WithErrorMessage("UpdatedBy is required");
    }

    [Fact]
    public void Validate_WithNegativeRate_ShouldFail()
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.LaborHours,
            -100m,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Rate)
            .WithErrorMessage("Overhead rate must be non-negative");
    }

    [Theory]
    [InlineData(1.5)]
    [InlineData(2.0)]
    [InlineData(10.0)]
    public void Validate_DirectCostPercentage_WithRateAboveOne_ShouldFail(decimal rate)
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.DirectCostPercentage,
            rate,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Rate)
            .WithErrorMessage("Percentage overhead rate must be between 0 and 1 (0-100%)");
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(0.15)]
    [InlineData(0.5)]
    [InlineData(1.0)]
    public void Validate_DirectCostPercentage_WithValidRate_ShouldPass(decimal rate)
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.DirectCostPercentage,
            rate,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Rate);
    }

    [Theory]
    [InlineData(1.5)]
    [InlineData(2.0)]
    public void Validate_Revenue_WithRateAboveOne_ShouldFail(decimal rate)
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.Revenue,
            rate,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Rate)
            .WithErrorMessage("Percentage overhead rate must be between 0 and 1 (0-100%)");
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(0.1)]
    [InlineData(1.0)]
    public void Validate_Revenue_WithValidRate_ShouldPass(decimal rate)
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.Revenue,
            rate,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Rate);
    }

    [Theory]
    [InlineData(1000)]
    [InlineData(5000)]
    [InlineData(10000)]
    [InlineData(100000)]
    public void Validate_LaborHours_WithAnyPositiveRate_ShouldPass(decimal rate)
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.LaborHours,
            rate,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Rate);
    }

    [Fact]
    public void Validate_WithInvalidMethod_ShouldFail()
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            (OverheadAllocationMethod)999, // Invalid enum value
            0.15m,
            Guid.NewGuid()
        );

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Method)
            .WithErrorMessage("Invalid overhead allocation method");
    }
}
