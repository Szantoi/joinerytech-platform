using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.Aggregates;

/// <summary>
/// ADR-063 rework loop domain tests:
/// - CompleteWithConditional transition set (the previously unreachable
///   InspectionResult.Conditional becomes a producible outcome),
/// - CreateRework guard set (re-check = NEW inspection referencing the
///   conditionally passed original; the original stays immutable).
/// </summary>
public class InspectionReworkTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();
    private readonly Guid _inspectorId = Guid.NewGuid();
    private readonly Guid _orderId = Guid.NewGuid();
    private readonly Guid _productId = Guid.NewGuid();

    private static List<FailureNote> MinorDefects() => new()
    {
        FailureNote.Create(FailureType.Scratch, "Kisebb felületi karc a fedlap élén")
    };

    private Inspection CreateInProgressInspection()
    {
        var inspection = Inspection.Create(
            _tenantId, _checkpointId, _inspectorId, DateTime.UtcNow.AddHours(1), _orderId, _productId);
        inspection.Start();
        inspection.ClearDomainEvents();
        return inspection;
    }

    private Inspection CreateConditionallyCompletedInspection()
    {
        var inspection = CreateInProgressInspection();
        inspection.CompleteWithConditional(MinorDefects(), "Javítás után újraellenőrzés");
        inspection.ClearDomainEvents();
        return inspection;
    }

    // ═══ CompleteWithConditional — transition set ═══════════════════════════

    [Fact]
    public void CompleteWithConditional_FromInProgress_ShouldCompleteWithConditionalResult()
    {
        var inspection = CreateInProgressInspection();

        inspection.CompleteWithConditional(MinorDefects(), "Kisebb hibák, javítható");

        inspection.Status.Should().Be(InspectionStatus.Completed);
        inspection.Result.Should().Be(InspectionResult.Conditional);
        inspection.Notes.Should().Be("Kisebb hibák, javítható");
        inspection.CompletedAt.Should().NotBeNull();
        inspection.FailureNotes.Should().HaveCount(1);

        var domainEvents = inspection.GetDomainEvents();
        domainEvents.Should().ContainSingle(e => e is InspectionCompletedConditionallyEvent);
        var evt = (InspectionCompletedConditionallyEvent)domainEvents.Single();
        evt.InspectionId.Should().Be(inspection.Id);
        evt.InspectorId.Should().Be(_inspectorId);
        evt.OrderId.Should().Be(_orderId);
        evt.ProductId.Should().Be(_productId);
        evt.FailureTypes.Should().ContainSingle().Which.Should().Be(FailureType.Scratch);
    }

    [Fact]
    public void CompleteWithConditional_FromPlanned_ShouldThrowInvalidStatusTransition()
    {
        var inspection = Inspection.Create(
            _tenantId, _checkpointId, _inspectorId, DateTime.UtcNow.AddHours(1));

        var act = () => inspection.CompleteWithConditional(MinorDefects());

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("Cannot transition from Planned to Completed");
    }

    [Fact]
    public void CompleteWithConditional_FromCompleted_ShouldThrowInvalidStatusTransition()
    {
        var inspection = CreateConditionallyCompletedInspection();

        var act = () => inspection.CompleteWithConditional(MinorDefects());

        // Completed is terminal — the re-check is a NEW inspection, never a reopen
        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("Cannot transition from Completed to Completed");
    }

    [Fact]
    public void CompleteWithConditional_WithoutFailureNotes_ShouldThrowDomainException()
    {
        var inspection = CreateInProgressInspection();

        var act = () => inspection.CompleteWithConditional(new List<FailureNote>());

        act.Should().Throw<DomainException>()
            .WithMessage("Failure notes are required when inspection passes conditionally");
        inspection.Status.Should().Be(InspectionStatus.InProgress);
        inspection.Result.Should().Be(InspectionResult.Pending);
    }

    // ═══ CreateRework — guard set ═══════════════════════════════════════════

    [Fact]
    public void CreateRework_FromConditionallyCompleted_ShouldReferenceOriginalAndInheritScope()
    {
        var original = CreateConditionallyCompletedInspection();
        var reworkInspector = Guid.NewGuid();
        var plannedAt = DateTime.UtcNow.AddHours(4);

        var rework = Inspection.CreateRework(original, reworkInspector, plannedAt);

        rework.Id.Should().NotBe(original.Id);
        rework.ReworkOfInspectionId.Should().Be(original.Id);
        rework.TenantId.Should().Be(_tenantId);
        rework.CheckpointId.Should().Be(_checkpointId);
        rework.OrderId.Should().Be(_orderId);
        rework.ProductId.Should().Be(_productId);
        rework.InspectorId.Should().Be(reworkInspector);
        rework.Status.Should().Be(InspectionStatus.Planned);
        rework.Result.Should().Be(InspectionResult.Pending);
        rework.GetDomainEvents().Should().ContainSingle(e => e is InspectionPlannedEvent);

        // The original stays untouched (immutable audit trail)
        original.Status.Should().Be(InspectionStatus.Completed);
        original.Result.Should().Be(InspectionResult.Conditional);
        original.ReworkOfInspectionId.Should().BeNull();
    }

    [Fact]
    public void CreateRework_FromPassCompleted_ShouldThrowInvalidStatusTransition()
    {
        var original = CreateInProgressInspection();
        original.CompleteWithPass("Minden rendben");

        var act = () => Inspection.CreateRework(original, Guid.NewGuid(), DateTime.UtcNow.AddHours(1));

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*Completed/Pass*");
    }

    [Fact]
    public void CreateRework_FromFailCompleted_ShouldThrowInvalidStatusTransition()
    {
        var original = CreateInProgressInspection();
        original.CompleteWithFail(new List<FailureNote>
        {
            FailureNote.Create(FailureType.Scratch, "Mély, nem javítható karcolás")
        });

        var act = () => Inspection.CreateRework(original, Guid.NewGuid(), DateTime.UtcNow.AddHours(1));

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*Completed/Fail*");
    }

    [Fact]
    public void CreateRework_FromInProgress_ShouldThrowInvalidStatusTransition()
    {
        var original = CreateInProgressInspection();

        var act = () => Inspection.CreateRework(original, Guid.NewGuid(), DateTime.UtcNow.AddHours(1));

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*InProgress/Pending*");
    }

    [Fact]
    public void CreateRework_WithPastPlannedDate_ShouldThrowDomainException()
    {
        var original = CreateConditionallyCompletedInspection();

        var act = () => Inspection.CreateRework(original, Guid.NewGuid(), DateTime.UtcNow.AddHours(-2));

        act.Should().Throw<DomainException>()
            .WithMessage("PlannedAt must be in the future or present");
    }

    [Fact]
    public void CreateRework_ChainedRework_ShouldAllowSecondLevel()
    {
        // Rework can itself pass conditionally → a second re-check chains back
        var original = CreateConditionallyCompletedInspection();
        var firstRework = Inspection.CreateRework(original, Guid.NewGuid(), DateTime.UtcNow.AddHours(1));
        firstRework.Start();
        firstRework.CompleteWithConditional(MinorDefects());

        var secondRework = Inspection.CreateRework(firstRework, Guid.NewGuid(), DateTime.UtcNow.AddHours(2));

        secondRework.ReworkOfInspectionId.Should().Be(firstRework.Id);
        firstRework.ReworkOfInspectionId.Should().Be(original.Id);
    }
}
