// Ehs.Tests/Unit/Domain/PhotoS3KeyTests.cs

using Ehs.Domain.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Ehs.Tests.Unit.Domain;

/// <summary>
/// Unit tests for PhotoS3Key value object.
/// </summary>
public sealed class PhotoS3KeyTests
{
    [Fact]
    public void From_WithValidKey_ShouldSucceed()
    {
        // Arrange
        var key = "incidents/2024/01/photo-123.jpg";

        // Act
        var photoS3Key = PhotoS3Key.From(key);

        // Assert
        photoS3Key.Should().NotBeNull();
        photoS3Key.Value.Should().Be(key);
    }

    [Fact]
    public void From_WithEmptyKey_ShouldThrowArgumentException()
    {
        // Act
        var act = () => PhotoS3Key.From("");

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("PhotoS3Key cannot be empty.*");
    }

    [Fact]
    public void From_WithKeyExceeding500Chars_ShouldThrowArgumentException()
    {
        // Arrange
        var key = new string('x', 501);

        // Act
        var act = () => PhotoS3Key.From(key);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("PhotoS3Key cannot exceed 500 characters.*");
    }

    [Fact]
    public void FromNullable_WithNullValue_ShouldReturnNull()
    {
        // Act
        var result = PhotoS3Key.FromNullable(null);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void FromNullable_WithValidValue_ShouldReturnPhotoS3Key()
    {
        // Arrange
        var key = "incidents/2024/01/photo-456.jpg";

        // Act
        var result = PhotoS3Key.FromNullable(key);

        // Assert
        result.Should().NotBeNull();
        result!.Value.Should().Be(key);
    }
}
