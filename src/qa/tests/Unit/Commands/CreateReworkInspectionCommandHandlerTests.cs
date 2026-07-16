using Ardalis.Result;
using FluentAssertions;
using Moq;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit.Commands;

/// <summary>
/// ADR-063: the re-check of a conditionally passed inspection is a NEW
/// Inspection referencing the original (ReworkOfInspectionId) — 404 for a
/// missing original, 409 when the original is not Completed+Conditional.
/// </summary>
public class CreateReworkInspectionCommandHandlerTests
{
    private readonly Mock<IInspectionRepository> _inspectionRepository = new();
    private readonly CreateReworkInspectionCommandHandler _handler;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();
    private readonly Guid _inspectorId = Guid.NewGuid();

    public CreateReworkInspectionCommandHandlerTests()
    {
        _handler = new CreateReworkInspectionCommandHandler(_inspectionRepository.Object);
    }

    private Inspection CreateConditionallyCompletedInspection()
    {
        var inspection = Inspection.Create(
            _tenantId, _checkpointId, _inspectorId, DateTime.UtcNow.AddHours(1), Guid.NewGuid());
        inspection.Start();
        inspection.CompleteWithConditional(new List<FailureNote>
        {
            FailureNote.Create(FailureType.Scratch, "Kisebb felületi karc a fedlapon")
        });
        return inspection;
    }

    private void SetupInspection(Inspection inspection)
    {
        _inspectionRepository
            .Setup(r => r.GetByIdAsync(inspection.Id, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inspection);
    }

    [Fact]
    public async Task Handle_ConditionalOriginal_ShouldCreateReworkReferencingOriginal()
    {
        var original = CreateConditionallyCompletedInspection();
        SetupInspection(original);
        Inspection? added = null;
        _inspectionRepository
            .Setup(r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()))
            .Callback<Inspection, CancellationToken>((i, _) => added = i)
            .Returns(Task.CompletedTask);
        var reworkInspector = Guid.NewGuid();

        var command = new CreateReworkInspectionCommand(
            original.Id, reworkInspector, DateTime.UtcNow.AddHours(4), _tenantId);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        added.Should().NotBeNull();
        result.Value.Should().Be(added!.Id);
        added.ReworkOfInspectionId.Should().Be(original.Id);
        added.CheckpointId.Should().Be(_checkpointId);
        added.OrderId.Should().Be(original.OrderId);
        added.InspectorId.Should().Be(reworkInspector);
        added.Status.Should().Be(InspectionStatus.Planned);
    }

    [Fact]
    public async Task Handle_OriginalNotFound_ShouldReturnNotFound()
    {
        var missingId = InspectionId.New();
        _inspectionRepository
            .Setup(r => r.GetByIdAsync(missingId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Inspection?)null);

        var command = new CreateReworkInspectionCommand(
            missingId, _inspectorId, DateTime.UtcNow.AddHours(1), _tenantId);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.Status.Should().Be(ResultStatus.NotFound);
        _inspectionRepository.Verify(
            r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_OriginalPassedCleanly_ShouldReturnConflict()
    {
        var original = Inspection.Create(
            _tenantId, _checkpointId, _inspectorId, DateTime.UtcNow.AddHours(1));
        original.Start();
        original.CompleteWithPass("Minden rendben");
        SetupInspection(original);

        var command = new CreateReworkInspectionCommand(
            original.Id, _inspectorId, DateTime.UtcNow.AddHours(1), _tenantId);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Conflict);
        result.Errors.First().Should().Contain("Conditional");
        _inspectionRepository.Verify(
            r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_PastPlannedAt_ShouldReturnInvalid()
    {
        var original = CreateConditionallyCompletedInspection();
        SetupInspection(original);

        var command = new CreateReworkInspectionCommand(
            original.Id, _inspectorId, DateTime.UtcNow.AddHours(-3), _tenantId);
        var result = await _handler.Handle(command, CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.First().ErrorMessage.Should().Contain("PlannedAt");
        _inspectionRepository.Verify(
            r => r.AddAsync(It.IsAny<Inspection>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
