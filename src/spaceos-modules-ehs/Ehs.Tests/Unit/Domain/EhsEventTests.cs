// Ehs.Tests/Unit/Domain/EhsEventTests.cs

using Ehs.Domain.Aggregates;
using Ehs.Domain.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Ehs.Tests.Unit.Domain;

/// <summary>
/// Unit tests for EhsEvent aggregate.
/// </summary>
public sealed class EhsEventTests
{
    [Fact]
    public void Create_WithValidData_ShouldSucceed()
    {
        // Arrange
        var eventId = EventId.From(Guid.NewGuid());
        var type = "INCIDENT_REPORTED";
        var payloadJson = "{\"reporterId\":\"user-123\"}";
        var metaJson = "{\"deviceId\":\"device-001\"}";
        var tenantId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        // Act
        var ehsEvent = EhsEvent.Create(eventId, type, payloadJson, metaJson, tenantId, now);

        // Assert
        ehsEvent.Should().NotBeNull();
        ehsEvent.EventId.Should().Be(eventId);
        ehsEvent.Type.Should().Be(type);
        ehsEvent.PayloadJson.Should().Be(payloadJson);
        ehsEvent.MetaJson.Should().Be(metaJson);
        ehsEvent.TenantId.Should().Be(tenantId);
        ehsEvent.CreatedAt.Should().Be(now);
        ehsEvent.Sequence.Should().Be(0); // Set by database
    }

    [Fact]
    public void Create_WithEmptyType_ShouldThrowArgumentException()
    {
        // Arrange
        var eventId = EventId.From(Guid.NewGuid());
        var type = "";
        var payloadJson = "{\"reporterId\":\"user-123\"}";
        var tenantId = Guid.NewGuid();

        // Act
        var act = () => EhsEvent.Create(eventId, type, payloadJson, null, tenantId);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Event type cannot be empty.*");
    }

    [Fact]
    public void Create_WithEmptyPayload_ShouldThrowArgumentException()
    {
        // Arrange
        var eventId = EventId.From(Guid.NewGuid());
        var type = "INCIDENT_REPORTED";
        var payloadJson = "";
        var tenantId = Guid.NewGuid();

        // Act
        var act = () => EhsEvent.Create(eventId, type, payloadJson, null, tenantId);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Payload cannot be empty.*");
    }

    [Fact]
    public void Create_WithEmptyTenantId_ShouldThrowArgumentException()
    {
        // Arrange
        var eventId = EventId.From(Guid.NewGuid());
        var type = "INCIDENT_REPORTED";
        var payloadJson = "{\"reporterId\":\"user-123\"}";
        var tenantId = Guid.Empty;

        // Act
        var act = () => EhsEvent.Create(eventId, type, payloadJson, null, tenantId);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("TenantId cannot be empty.*");
    }
}
