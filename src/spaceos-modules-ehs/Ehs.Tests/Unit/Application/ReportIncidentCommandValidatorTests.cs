// Ehs.Tests/Unit/Application/ReportIncidentCommandValidatorTests.cs

using Ehs.Application.Commands;
using Ehs.Application.DTOs;
using FluentAssertions;
using Xunit;

namespace Ehs.Tests.Unit.Application;

/// <summary>
/// Unit tests for ReportIncidentCommandValidator.
/// </summary>
public sealed class ReportIncidentCommandValidatorTests
{
    private readonly ReportIncidentCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_ShouldSucceed()
    {
        // Arrange
        var command = new ReportIncidentCommand(
            EventId: Guid.NewGuid(),
            Type: "INCIDENT_REPORTED",
            Payload: new IncidentPayload
            {
                ReporterId = Guid.NewGuid(),
                IncidentType = "near-miss",
                LocationId = "workshop-A",
                Timestamp = DateTimeOffset.UtcNow,
                Description = "Test incident",
                PhotoS3Key = null
            },
            Meta: null
        );

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyEventId_ShouldFail()
    {
        // Arrange
        var command = new ReportIncidentCommand(
            EventId: Guid.Empty,
            Type: "INCIDENT_REPORTED",
            Payload: new IncidentPayload
            {
                ReporterId = Guid.NewGuid(),
                IncidentType = "injury",
                LocationId = "workshop-A",
                Timestamp = DateTimeOffset.UtcNow,
                Description = "Test incident",
                PhotoS3Key = null
            },
            Meta: null
        );

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "EventId");
    }

    [Fact]
    public void Validate_WithInvalidType_ShouldFail()
    {
        // Arrange
        var command = new ReportIncidentCommand(
            EventId: Guid.NewGuid(),
            Type: "WRONG_TYPE",
            Payload: new IncidentPayload
            {
                ReporterId = Guid.NewGuid(),
                IncidentType = "injury",
                LocationId = "workshop-A",
                Timestamp = DateTimeOffset.UtcNow,
                Description = "Test incident",
                PhotoS3Key = null
            },
            Meta: null
        );

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Type");
    }

    [Fact]
    public void Validate_WithEmptyReporterId_ShouldFail()
    {
        // Arrange
        var command = new ReportIncidentCommand(
            EventId: Guid.NewGuid(),
            Type: "INCIDENT_REPORTED",
            Payload: new IncidentPayload
            {
                ReporterId = Guid.Empty,
                IncidentType = "injury",
                LocationId = "workshop-A",
                Timestamp = DateTimeOffset.UtcNow,
                Description = "Test incident",
                PhotoS3Key = null
            },
            Meta: null
        );

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("ReporterId"));
    }

    [Fact]
    public void Validate_WithInvalidIncidentType_ShouldFail()
    {
        // Arrange
        var command = new ReportIncidentCommand(
            EventId: Guid.NewGuid(),
            Type: "INCIDENT_REPORTED",
            Payload: new IncidentPayload
            {
                ReporterId = Guid.NewGuid(),
                IncidentType = "invalid-type",
                LocationId = "workshop-A",
                Timestamp = DateTimeOffset.UtcNow,
                Description = "Test incident",
                PhotoS3Key = null
            },
            Meta: null
        );

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("IncidentType"));
    }

    [Fact]
    public void Validate_WithDescriptionExceeding2000Chars_ShouldFail()
    {
        // Arrange
        var command = new ReportIncidentCommand(
            EventId: Guid.NewGuid(),
            Type: "INCIDENT_REPORTED",
            Payload: new IncidentPayload
            {
                ReporterId = Guid.NewGuid(),
                IncidentType = "injury",
                LocationId = "workshop-A",
                Timestamp = DateTimeOffset.UtcNow,
                Description = new string('x', 2001),
                PhotoS3Key = null
            },
            Meta: null
        );

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("Description"));
    }
}
