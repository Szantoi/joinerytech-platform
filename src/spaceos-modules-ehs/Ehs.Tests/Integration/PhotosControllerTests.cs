// Ehs.Tests/Integration/PhotosControllerTests.cs

using Ehs.Application.DTOs;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace Ehs.Tests.Integration;

/// <summary>
/// Integration tests for PhotosController (S3 presigned URL generation).
/// </summary>
public sealed class PhotosControllerTests : EhsApiTestBase
{
    [Fact]
    public async Task PostPresignedUrl_WithValidRequest_ShouldReturn200OK()
    {
        // Arrange
        var request = new
        {
            filename = "incident-photo.jpg",
            size = 1_048_576, // 1MB
            mime = "image/jpeg"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/ehs/photos/presigned-url", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PresignedUrlResponse>();
        result.Should().NotBeNull();
        result!.UploadUrl.Should().NotBeNullOrWhiteSpace();
        result.S3Key.Should().NotBeNullOrWhiteSpace();
        result.ExpiresAt.Should().BeAfter(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task PostPresignedUrl_WithFileSizeExceeding5MB_ShouldReturn400BadRequest()
    {
        // Arrange
        var request = new
        {
            filename = "large-photo.jpg",
            size = 5_242_881, // 5MB + 1 byte
            mime = "image/jpeg"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/ehs/photos/presigned-url", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostPresignedUrl_WithInvalidMimeType_ShouldReturn400BadRequest()
    {
        // Arrange
        var request = new
        {
            filename = "document.pdf",
            size = 1_048_576,
            mime = "application/pdf"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/ehs/photos/presigned-url", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostPresignedUrl_WithEmptyFilename_ShouldReturn400BadRequest()
    {
        // Arrange
        var request = new
        {
            filename = "",
            size = 1_048_576,
            mime = "image/jpeg"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/ehs/photos/presigned-url", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    public async Task PostPresignedUrl_WithValidMimeTypes_ShouldReturn200OK(string mimeType)
    {
        // Arrange
        var request = new
        {
            filename = $"photo-{Guid.NewGuid()}.jpg",
            size = 2_097_152, // 2MB
            mime = mimeType
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/ehs/photos/presigned-url", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
