// Ehs.Tests/Unit/Application/GeneratePresignedUrlQueryValidatorTests.cs

using Ehs.Application.Queries;
using FluentAssertions;
using Xunit;

namespace Ehs.Tests.Unit.Application;

/// <summary>
/// Unit tests for GeneratePresignedUrlQueryValidator.
/// </summary>
public sealed class GeneratePresignedUrlQueryValidatorTests
{
    private readonly GeneratePresignedUrlQueryValidator _validator = new();

    [Fact]
    public void Validate_WithValidQuery_ShouldSucceed()
    {
        // Arrange
        var query = new GeneratePresignedUrlQuery(
            Filename: "incident-photo.jpg",
            Size: 1_048_576, // 1MB
            Mime: "image/jpeg"
        );

        // Act
        var result = _validator.Validate(query);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyFilename_ShouldFail()
    {
        // Arrange
        var query = new GeneratePresignedUrlQuery(
            Filename: "",
            Size: 1_048_576,
            Mime: "image/jpeg"
        );

        // Act
        var result = _validator.Validate(query);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Filename");
    }

    [Fact]
    public void Validate_WithFileSizeExceeding5MB_ShouldFail()
    {
        // Arrange
        var query = new GeneratePresignedUrlQuery(
            Filename: "large-photo.jpg",
            Size: 5_242_881, // 5MB + 1 byte
            Mime: "image/jpeg"
        );

        // Act
        var result = _validator.Validate(query);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Size");
    }

    [Fact]
    public void Validate_WithInvalidMimeType_ShouldFail()
    {
        // Arrange
        var query = new GeneratePresignedUrlQuery(
            Filename: "document.pdf",
            Size: 1_048_576,
            Mime: "application/pdf"
        );

        // Act
        var result = _validator.Validate(query);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Mime");
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    public void Validate_WithValidMimeTypes_ShouldSucceed(string mimeType)
    {
        // Arrange
        var query = new GeneratePresignedUrlQuery(
            Filename: "photo.jpg",
            Size: 1_048_576,
            Mime: mimeType
        );

        // Act
        var result = _validator.Validate(query);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithZeroFileSize_ShouldFail()
    {
        // Arrange
        var query = new GeneratePresignedUrlQuery(
            Filename: "photo.jpg",
            Size: 0,
            Mime: "image/jpeg"
        );

        // Act
        var result = _validator.Validate(query);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Size");
    }
}
