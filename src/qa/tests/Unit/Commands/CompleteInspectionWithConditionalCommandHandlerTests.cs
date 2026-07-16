using Ardalis.Result;
using FluentAssertions;
using Moq;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit.Commands;

/// <summary>
/// ADR-063: the Conditional completion must spawn the rework Ticket
/// (type Repair, linked via InspectionId, reported by the inspector) and
/// map failures to the module error contract (409 transition / 400 payload).
/// </summary>
public class CompleteInspectionWithConditionalCommandHandlerTests
{
    private readonly Mock<IInspectionRepository> _inspectionRepository = new();
    private readonly Mock<ITicketRepository> _ticketRepository = new();
    private readonly Mock<IQACheckpointRepository> _checkpointRepository = new();
    private readonly CompleteInspectionWithConditionalCommandHandler _handler;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();
    private readonly Guid _inspectorId = Guid.NewGuid();
    private readonly Guid _orderId = Guid.NewGuid();
    private readonly Guid _productId = Guid.NewGuid();

    public CompleteInspectionWithConditionalCommandHandlerTests()
    {
        _handler = new CompleteInspectionWithConditionalCommandHandler(
            _inspectionRepository.Object,
            _ticketRepository.Object,
            _checkpointRepository.Object);
    }

    private Inspection CreateInProgressInspection()
    {
        var inspection = Inspection.Create(
            _tenantId, _checkpointId, _inspectorId, DateTime.UtcNow.AddHours(1), _orderId, _productId);
        inspection.Start();
        return inspection;
    }

    private CompleteInspectionWithConditionalCommand CommandFor(
        Inspection inspection,
        List<FailureNoteInput>? failureNotes = null,
        CrmTaskPriority priority = CrmTaskPriority.Medium)
        => new(
            inspection.Id,
            failureNotes ?? new List<FailureNoteInput>
            {
                new(FailureType.Scratch, "Kisebb felületi karc a fedlap élén")
            },
            "Javítás után újraellenőrzés szükséges",
            priority,
            _tenantId);

    private void SetupInspection(Inspection inspection)
    {
        _inspectionRepository
            .Setup(r => r.GetByIdAsync(inspection.Id, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inspection);
    }

    [Fact]
    public async Task Handle_InProgressInspection_ShouldCompleteConditionallyAndSpawnReworkTicket()
    {
        // Arrange
        var inspection = CreateInProgressInspection();
        SetupInspection(inspection);
        var checkpoint = QACheckpoint.Create(_tenantId, "Végső ellenőrzés", CheckpointType.Final, CriticalLevel.Major);
        _checkpointRepository
            .Setup(r => r.GetByIdAsync(_checkpointId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(checkpoint);
        Ticket? spawnedTicket = null;
        _ticketRepository
            .Setup(r => r.AddAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
            .Callback<Ticket, CancellationToken>((t, _) => spawnedTicket = t)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(CommandFor(inspection, priority: CrmTaskPriority.High), CancellationToken.None);

        // Assert — inspection completed with the previously unreachable Conditional result
        result.IsSuccess.Should().BeTrue();
        inspection.Status.Should().Be(InspectionStatus.Completed);
        inspection.Result.Should().Be(InspectionResult.Conditional);

        // Rework ticket spawn (the conditional outcome must never get lost)
        spawnedTicket.Should().NotBeNull();
        result.Value.Should().Be(spawnedTicket!.Id.Value);
        spawnedTicket.TicketType.Should().Be(TicketType.Repair);
        spawnedTicket.Priority.Should().Be(CrmTaskPriority.High);
        spawnedTicket.ReportedBy.Should().Be(_inspectorId);
        spawnedTicket.InspectionId.Should().Be(inspection.Id.Value);
        spawnedTicket.OrderId.Should().Be(_orderId);
        spawnedTicket.ProductId.Should().Be(_productId);
        spawnedTicket.Status.Should().Be(TicketStatus.Reported);
        spawnedTicket.Title.Should().Contain("Végső ellenőrzés");
        spawnedTicket.Description.Should().Contain("Kisebb felületi karc a fedlap élén");
        spawnedTicket.Description.Should().Contain(inspection.Id.Value.ToString());

        _inspectionRepository.Verify(
            r => r.UpdateAsync(inspection, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_CheckpointMissing_ShouldUseFallbackTicketTitle()
    {
        var inspection = CreateInProgressInspection();
        SetupInspection(inspection);
        _checkpointRepository
            .Setup(r => r.GetByIdAsync(_checkpointId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((QACheckpoint?)null);
        Ticket? spawnedTicket = null;
        _ticketRepository
            .Setup(r => r.AddAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
            .Callback<Ticket, CancellationToken>((t, _) => spawnedTicket = t)
            .Returns(Task.CompletedTask);

        var result = await _handler.Handle(CommandFor(inspection), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        spawnedTicket!.Title.Should().Be("Feltételes megfelelés — javítás szükséges");
    }

    [Fact]
    public async Task Handle_InspectionNotFound_ShouldReturnNotFound()
    {
        var missingId = InspectionId.New();
        _inspectionRepository
            .Setup(r => r.GetByIdAsync(missingId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Inspection?)null);

        var command = new CompleteInspectionWithConditionalCommand(
            missingId,
            new List<FailureNoteInput> { new(FailureType.Scratch, "Kisebb felületi karc") },
            null,
            CrmTaskPriority.Medium,
            _tenantId);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.Status.Should().Be(ResultStatus.NotFound);
        _ticketRepository.Verify(
            r => r.AddAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_IllegalTransition_ShouldReturnConflictAndSaveNothing()
    {
        // Planned (not started) inspection — FSM forbids Planned → Completed
        var inspection = Inspection.Create(
            _tenantId, _checkpointId, _inspectorId, DateTime.UtcNow.AddHours(1));
        SetupInspection(inspection);

        var result = await _handler.Handle(CommandFor(inspection), CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Conflict);
        result.Errors.First().Should().Contain("Cannot transition from Planned to Completed");
        _ticketRepository.Verify(
            r => r.AddAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()), Times.Never);
        _inspectionRepository.Verify(
            r => r.UpdateAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithoutFailureNotes_ShouldReturnInvalidAndSaveNothing()
    {
        var inspection = CreateInProgressInspection();
        SetupInspection(inspection);

        var result = await _handler.Handle(
            CommandFor(inspection, failureNotes: new List<FailureNoteInput>()), CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.First().ErrorMessage
            .Should().Contain("Failure notes are required when inspection passes conditionally");
        _ticketRepository.Verify(
            r => r.AddAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()), Times.Never);
        _inspectionRepository.Verify(
            r => r.UpdateAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_RepositoryThrows_ShouldReturnError()
    {
        var inspection = CreateInProgressInspection();
        SetupInspection(inspection);
        _ticketRepository
            .Setup(r => r.AddAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        var result = await _handler.Handle(CommandFor(inspection), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Errors.First().Should().Contain("Failed to complete inspection with conditional");
    }
}
