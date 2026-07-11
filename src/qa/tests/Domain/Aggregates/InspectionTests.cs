using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.Aggregates;

public class InspectionTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();
    private readonly Guid _inspectorId = Guid.NewGuid();
    private readonly Guid _orderId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateValidInspection()
    {
        // Arrange
        var plannedAt = DateTime.UtcNow.AddHours(2);

        // Act
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            plannedAt,
            _orderId);

        // Assert
        inspection.Should().NotBeNull();
        inspection.CheckpointId.Should().Be(_checkpointId);
        inspection.InspectorId.Should().Be(_inspectorId);
        inspection.OrderId.Should().Be(_orderId);
        inspection.Status.Should().Be(InspectionStatus.Planned);
        inspection.Result.Should().Be(InspectionResult.Pending);

        var domainEvents = inspection.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<InspectionPlannedEvent>();
    }

    [Fact]
    public void Create_WithPastPlannedDate_ShouldThrow()
    {
        // Arrange
        var plannedAt = DateTime.UtcNow.AddHours(-2); // Past date

        // Act
        var act = () => Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            plannedAt);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("PlannedAt must be in the future or present");
    }

    [Fact]
    public void Start_ShouldTransitionToInProgress()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        inspection.ClearDomainEvents();

        // Act
        inspection.Start();

        // Assert
        inspection.Status.Should().Be(InspectionStatus.InProgress);
        inspection.StartedAt.Should().NotBeNull();
        inspection.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        var domainEvents = inspection.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<InspectionStartedEvent>();
    }

    [Fact]
    public void Start_FromCompletedStatus_ShouldThrow()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        inspection.Start();
        inspection.CompleteWithPass();

        // Act
        var act = () => inspection.Start();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot transition from Completed to InProgress");
    }

    [Fact]
    public void CompleteWithPass_ShouldSetResultToPass()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        inspection.Start();
        inspection.ClearDomainEvents();

        // Act
        inspection.CompleteWithPass("All checks passed");

        // Assert
        inspection.Status.Should().Be(InspectionStatus.Completed);
        inspection.Result.Should().Be(InspectionResult.Pass);
        inspection.Notes.Should().Be("All checks passed");
        inspection.CompletedAt.Should().NotBeNull();

        var domainEvents = inspection.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<InspectionCompletedEvent>();
    }

    [Fact]
    public void CompleteWithPass_FromPlannedStatus_ShouldThrow()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        // Act
        var act = () => inspection.CompleteWithPass();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot transition from Planned to Completed");
    }

    [Fact]
    public void CompleteWithFail_WithFailureNotes_ShouldSetResultToFail()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1),
            _orderId);

        inspection.Start();
        inspection.ClearDomainEvents();

        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Dimension, "Height 5mm out of tolerance"),
            FailureNote.Create(FailureType.Surface, "Surface scratch detected")
        };

        // Act
        inspection.CompleteWithFail(failureNotes, "Multiple issues found");

        // Assert
        inspection.Status.Should().Be(InspectionStatus.Completed);
        inspection.Result.Should().Be(InspectionResult.Fail);
        inspection.FailureNotes.Should().HaveCount(2);
        inspection.Notes.Should().Be("Multiple issues found");

        var domainEvents = inspection.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<InspectionFailedEvent>();

        var failedEvent = (InspectionFailedEvent)domainEvents.First();
        failedEvent.FailureTypes.Should().Contain(FailureType.Dimension);
        failedEvent.FailureTypes.Should().Contain(FailureType.Surface);
    }

    [Fact]
    public void CompleteWithFail_WithoutFailureNotes_ShouldThrow()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        inspection.Start();

        // Act
        var act = () => inspection.CompleteWithFail(new List<FailureNote>());

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Failure notes are required when inspection fails");
    }

    [Fact]
    public void AddFailureNote_ToCompletedFailedInspection_ShouldAddNote()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        inspection.Start();

        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Dimension, "Height issue")
        };

        inspection.CompleteWithFail(failureNotes);

        // Act
        inspection.AddFailureNote(FailureType.Surface, "Additional scratch found");

        // Assert
        inspection.FailureNotes.Should().HaveCount(2);
        inspection.FailureNotes!.Last().FailureType.Should().Be(FailureType.Surface);
    }

    [Fact]
    public void AddFailureNote_ToPassedInspection_ShouldThrow()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        inspection.Start();
        inspection.CompleteWithPass();

        // Act
        var act = () => inspection.AddFailureNote(FailureType.Surface, "Cannot add to passed inspection");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Can only add failure notes to failed inspections");
    }

    [Fact]
    public void UpdateNotes_ShouldUpdateInspectorNotes()
    {
        // Arrange
        var inspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            _inspectorId,
            DateTime.UtcNow.AddHours(1));

        // Act
        inspection.UpdateNotes("Updated notes for audit trail");

        // Assert
        inspection.Notes.Should().Be("Updated notes for audit trail");
    }
}
