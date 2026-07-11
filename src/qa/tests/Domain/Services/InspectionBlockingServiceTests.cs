using FluentAssertions;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Services;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.Services;

public class InspectionBlockingServiceTests
{
    private readonly InspectionBlockingService _service = new();
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _orderId = Guid.NewGuid();

    [Fact]
    public void IsProductionBlocked_WithFailedCriticalInspection_ShouldReturnTrue()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Critical Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        var inspection = Inspection.Create(
            _tenantId,
            checkpoint.Id,
            Guid.NewGuid(),
            DateTime.UtcNow,
            _orderId);

        inspection.Start();

        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Dimension, "Out of tolerance")
        };

        inspection.CompleteWithFail(failureNotes);

        // Act
        var result = _service.IsProductionBlocked(inspection, checkpoint);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsProductionBlocked_WithPassedCriticalInspection_ShouldReturnFalse()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Critical Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        var inspection = Inspection.Create(
            _tenantId,
            checkpoint.Id,
            Guid.NewGuid(),
            DateTime.UtcNow,
            _orderId);

        inspection.Start();
        inspection.CompleteWithPass();

        // Act
        var result = _service.IsProductionBlocked(inspection, checkpoint);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsProductionBlocked_WithFailedMajorInspection_ShouldReturnFalse()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Major Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Major); // Not Critical!

        var inspection = Inspection.Create(
            _tenantId,
            checkpoint.Id,
            Guid.NewGuid(),
            DateTime.UtcNow,
            _orderId);

        inspection.Start();

        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Surface, "Minor defect")
        };

        inspection.CompleteWithFail(failureNotes);

        // Act
        var result = _service.IsProductionBlocked(inspection, checkpoint);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void GetBlockingInspections_WithMultipleInspections_ShouldReturnOnlyFailed()
    {
        // Arrange
        var checkpointId = QACheckpointId.New();
        var inspectorId = Guid.NewGuid();

        var passedInspection = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow,
            _orderId);
        passedInspection.Start();
        passedInspection.CompleteWithPass();

        var failedInspection = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow,
            _orderId);
        failedInspection.Start();
        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Dimension, "Failed check")
        };
        failedInspection.CompleteWithFail(failureNotes);

        var inspections = new List<Inspection> { passedInspection, failedInspection };

        // Act
        var result = _service.GetBlockingInspections(_orderId, inspections);

        // Assert
        result.Should().HaveCount(1);
        result.First().Should().Be(failedInspection);
    }

    [Fact]
    public void GetBlockingInspections_WithDifferentOrders_ShouldFilterByOrderId()
    {
        // Arrange
        var otherOrderId = Guid.NewGuid();
        var checkpointId = QACheckpointId.New();
        var inspectorId = Guid.NewGuid();

        var inspection1 = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow,
            _orderId);
        inspection1.Start();
        var failureNotes1 = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Dimension, "Failed inspection")
        };
        inspection1.CompleteWithFail(failureNotes1);

        var inspection2 = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow,
            otherOrderId);
        inspection2.Start();
        var failureNotes2 = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Surface, "Failed inspection")
        };
        inspection2.CompleteWithFail(failureNotes2);

        var inspections = new List<Inspection> { inspection1, inspection2 };

        // Act
        var result = _service.GetBlockingInspections(_orderId, inspections);

        // Assert
        result.Should().HaveCount(1);
        result.First().OrderId.Should().Be(_orderId);
    }

    [Fact]
    public void GetBlockingInspections_WithPlannedInspection_ShouldExcludeNonCompleted()
    {
        // Arrange
        var checkpointId = QACheckpointId.New();
        var inspectorId = Guid.NewGuid();

        var plannedInspection = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow.AddHours(1),
            _orderId);

        var inspections = new List<Inspection> { plannedInspection };

        // Act
        var result = _service.GetBlockingInspections(_orderId, inspections);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void HasBlockingInspections_WithBlockingInspection_ShouldReturnTrue()
    {
        // Arrange
        var checkpointId = QACheckpointId.New();
        var inspectorId = Guid.NewGuid();

        var failedInspection = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow,
            _orderId);
        failedInspection.Start();
        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Dimension, "Failed inspection")
        };
        failedInspection.CompleteWithFail(failureNotes);

        var inspections = new List<Inspection> { failedInspection };

        // Act
        var result = _service.HasBlockingInspections(_orderId, inspections);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void HasBlockingInspections_WithoutBlockingInspection_ShouldReturnFalse()
    {
        // Arrange
        var checkpointId = QACheckpointId.New();
        var inspectorId = Guid.NewGuid();

        var passedInspection = Inspection.Create(
            _tenantId,
            checkpointId,
            inspectorId,
            DateTime.UtcNow,
            _orderId);
        passedInspection.Start();
        passedInspection.CompleteWithPass();

        var inspections = new List<Inspection> { passedInspection };

        // Act
        var result = _service.HasBlockingInspections(_orderId, inspections);

        // Assert
        result.Should().BeFalse();
    }
}
