using Ardalis.Result;
using FluentAssertions;
using Moq;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit.Queries;

/// <summary>
/// Unit tests for GetInspectionQueryHandler.
/// </summary>
public class GetInspectionQueryHandlerTests
{
    private readonly Mock<IInspectionRepository> _mockInspectionRepository;
    private readonly Mock<IQACheckpointRepository> _mockCheckpointRepository;
    private readonly GetInspectionQueryHandler _handler;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly InspectionId _inspectionId = InspectionId.New();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();

    public GetInspectionQueryHandlerTests()
    {
        _mockInspectionRepository = new Mock<IInspectionRepository>();
        _mockCheckpointRepository = new Mock<IQACheckpointRepository>();
        _handler = new GetInspectionQueryHandler(
            _mockInspectionRepository.Object,
            _mockCheckpointRepository.Object);
    }

    [Fact]
    public async Task Handle_InspectionExists_ShouldReturnInspectionDto()
    {
        // Arrange
        var inspectorId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            inspectorId,
            DateTime.UtcNow.AddHours(2),
            orderId,
            productId);

        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Test Checkpoint",
            CheckpointType.Final,
            CriticalLevel.Major);

        _mockInspectionRepository
            .Setup(r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inspection);

        _mockCheckpointRepository
            .Setup(r => r.GetByIdAsync(_checkpointId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(checkpoint);

        var query = new GetInspectionQuery(_inspectionId, _tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Id.Should().Be(inspection.Id.Value);
        result.Value.CheckpointId.Should().Be(_checkpointId.Value);
        result.Value.CheckpointName.Should().Be("Test Checkpoint");
        result.Value.OrderId.Should().Be(orderId);
        result.Value.ProductId.Should().Be(productId);
        result.Value.InspectorId.Should().Be(inspectorId);
        result.Value.Status.Should().Be(InspectionStatus.Planned);
        result.Value.Result.Should().Be(InspectionResult.Pending);
    }

    [Fact]
    public async Task Handle_InspectionNotFound_ShouldReturnNotFound()
    {
        // Arrange
        _mockInspectionRepository
            .Setup(r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Inspection?)null);

        var query = new GetInspectionQuery(_inspectionId, _tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeFalse();
        result.Status.Should().Be(ResultStatus.NotFound);
        result.Errors.Should().Contain("Inspection not found");

        _mockInspectionRepository.Verify(
            r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()),
            Times.Once);

        _mockCheckpointRepository.Verify(
            r => r.GetByIdAsync(It.IsAny<QACheckpointId>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_CheckpointNotFound_ShouldReturnUnknownCheckpointName()
    {
        // Arrange
        var inspectorId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            inspectorId,
            DateTime.UtcNow.AddHours(2),
            orderId);

        _mockInspectionRepository
            .Setup(r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inspection);

        _mockCheckpointRepository
            .Setup(r => r.GetByIdAsync(_checkpointId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((QACheckpoint?)null);

        var query = new GetInspectionQuery(_inspectionId, _tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.CheckpointName.Should().Be("UNKNOWN");
    }

    [Fact]
    public async Task Handle_RepositoryThrowsException_ShouldReturnError()
    {
        // Arrange
        _mockInspectionRepository
            .Setup(r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        var query = new GetInspectionQuery(_inspectionId, _tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
        result.Errors.First().Should().Contain("Failed to retrieve inspection");
        result.Errors.First().Should().Contain("Database error");
    }
}
