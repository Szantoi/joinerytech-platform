using Ardalis.Result;
using FluentAssertions;
using Moq;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit.Commands;

/// <summary>
/// Unit tests for CreateInspectionCommandHandler.
/// </summary>
public class CreateInspectionCommandHandlerTests
{
    private readonly Mock<IInspectionRepository> _mockRepository;
    private readonly CreateInspectionCommandHandler _handler;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();
    private readonly Guid _inspectorId = Guid.NewGuid();
    private readonly Guid _orderId = Guid.NewGuid();
    private readonly Guid _productId = Guid.NewGuid();

    public CreateInspectionCommandHandlerTests()
    {
        _mockRepository = new Mock<IInspectionRepository>();
        _handler = new CreateInspectionCommandHandler(_mockRepository.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_ShouldReturnSuccessWithInspectionId()
    {
        // Arrange
        var plannedAt = DateTime.UtcNow.AddHours(2);
        var command = new CreateInspectionCommand(
            _checkpointId,
            _inspectorId,
            plannedAt,
            _orderId,
            _productId,
            _tenantId);

        _mockRepository
            .Setup(r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Value.Should().NotBeEmpty();

        _mockRepository.Verify(
            r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_PastPlannedDate_ShouldReturnError()
    {
        // Arrange
        var pastDate = DateTime.UtcNow.AddHours(-2); // Past date
        var command = new CreateInspectionCommand(
            _checkpointId,
            _inspectorId,
            pastDate,
            _orderId,
            _productId,
            _tenantId);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
        result.Errors.First().Should().Contain("Failed to create inspection");

        _mockRepository.Verify(
            r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_RepositoryThrowsException_ShouldReturnError()
    {
        // Arrange
        var plannedAt = DateTime.UtcNow.AddHours(2);
        var command = new CreateInspectionCommand(
            _checkpointId,
            _inspectorId,
            plannedAt,
            _orderId,
            _productId,
            _tenantId);

        _mockRepository
            .Setup(r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
        result.Errors.First().Should().Contain("Failed to create inspection");
        result.Errors.First().Should().Contain("Database connection failed");
    }

    [Fact]
    public async Task Handle_ValidCommand_ShouldCallRepositoryWithCorrectTenant()
    {
        // Arrange
        var plannedAt = DateTime.UtcNow.AddHours(2);
        var command = new CreateInspectionCommand(
            _checkpointId,
            _inspectorId,
            plannedAt,
            _orderId,
            _productId,
            _tenantId);

        Inspection? capturedInspection = null;
        _mockRepository
            .Setup(r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()))
            .Callback<Inspection, CancellationToken>((inspection, ct) => capturedInspection = inspection)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        capturedInspection.Should().NotBeNull();
        capturedInspection!.TenantId.Should().Be(_tenantId);
        capturedInspection.CheckpointId.Should().Be(_checkpointId);
        capturedInspection.InspectorId.Should().Be(_inspectorId);
        capturedInspection.OrderId.Should().Be(_orderId);
        capturedInspection.ProductId.Should().Be(_productId);
    }
}
