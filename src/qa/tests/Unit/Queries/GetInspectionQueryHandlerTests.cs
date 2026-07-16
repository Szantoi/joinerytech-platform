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
    private readonly Mock<ITicketRepository> _mockTicketRepository;
    private readonly GetInspectionQueryHandler _handler;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly InspectionId _inspectionId = InspectionId.New();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();

    public GetInspectionQueryHandlerTests()
    {
        _mockInspectionRepository = new Mock<IInspectionRepository>();
        _mockCheckpointRepository = new Mock<IQACheckpointRepository>();
        _mockTicketRepository = new Mock<ITicketRepository>();
        // Default: no linked tickets (the ADR-063 openTicketId derivation is opt-in per test)
        _mockTicketRepository
            .Setup(r => r.GetByInspectionIdAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Empty<Ticket>());
        _handler = new GetInspectionQueryHandler(
            _mockInspectionRepository.Object,
            _mockCheckpointRepository.Object,
            _mockTicketRepository.Object);
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
        result.Value.ReworkOfInspectionId.Should().BeNull();
        result.Value.OpenTicketId.Should().BeNull();
    }

    [Fact]
    public async Task Handle_OpenLinkedTicket_ShouldSurfaceOpenTicketId()
    {
        // Arrange — ADR-063: the portal derives "javitasra" from openTicketId
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            Guid.NewGuid(),
            DateTime.UtcNow.AddHours(2));

        var openTicket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Feltételes megfelelés — javítás",
            "Javítandó kisebb felületi hibák a fedlapon.",
            reportedBy: Guid.NewGuid(),
            inspectionId: inspection.Id.Value);

        var resolvedTicket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Korábbi javítás — lezárva",
            "Már megoldott korábbi hibajegy ugyanahhoz az átvizsgáláshoz.",
            reportedBy: Guid.NewGuid(),
            inspectionId: inspection.Id.Value);
        resolvedTicket.Assign(Guid.NewGuid());
        resolvedTicket.Start();
        resolvedTicket.Resolve(
            new List<SpaceOS.Modules.QA.Domain.ValueObjects.ResolutionAction>
            {
                SpaceOS.Modules.QA.Domain.ValueObjects.ResolutionAction.Create(
                    ActionType.Repair,
                    "Felület újracsiszolva és lakkozva")
            });

        _mockInspectionRepository
            .Setup(r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inspection);
        _mockCheckpointRepository
            .Setup(r => r.GetByIdAsync(_checkpointId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((QACheckpoint?)null);
        _mockTicketRepository
            .Setup(r => r.GetByInspectionIdAsync(inspection.Id.Value, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { resolvedTicket, openTicket });

        // Act
        var result = await _handler.Handle(new GetInspectionQuery(_inspectionId, _tenantId), CancellationToken.None);

        // Assert — the RESOLVED ticket must not count as open
        result.IsSuccess.Should().BeTrue();
        result.Value.OpenTicketId.Should().Be(openTicket.Id.Value);
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
