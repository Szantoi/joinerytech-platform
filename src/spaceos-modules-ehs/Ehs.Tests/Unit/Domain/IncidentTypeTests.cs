// Ehs.Tests/Unit/Domain/IncidentTypeTests.cs

using Ehs.Domain.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Ehs.Tests.Unit.Domain;

/// <summary>
/// Unit tests for IncidentType enum and extension methods.
/// </summary>
public sealed class IncidentTypeTests
{
    [Theory]
    [InlineData(IncidentType.NearMiss, "near-miss")]
    [InlineData(IncidentType.Injury, "injury")]
    [InlineData(IncidentType.Property, "property")]
    public void ToApiString_ShouldReturnCorrectValue(IncidentType type, string expected)
    {
        // Act
        var result = type.ToApiString();

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("near-miss", IncidentType.NearMiss)]
    [InlineData("injury", IncidentType.Injury)]
    [InlineData("property", IncidentType.Property)]
    [InlineData("NEAR-MISS", IncidentType.NearMiss)] // Case insensitive
    [InlineData("INJURY", IncidentType.Injury)]
    public void FromApiString_WithValidValue_ShouldReturnCorrectType(string value, IncidentType expected)
    {
        // Act
        var result = IncidentTypeExtensions.FromApiString(value);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void FromApiString_WithInvalidValue_ShouldThrowArgumentException()
    {
        // Arrange
        var invalidValue = "invalid-type";

        // Act
        var act = () => IncidentTypeExtensions.FromApiString(invalidValue);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Invalid incident type:*");
    }
}
