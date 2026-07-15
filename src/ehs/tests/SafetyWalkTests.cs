using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

/// <summary>
/// FSM tests for SafetyWalk: utemezett(Scheduled) → folyamatban(InProgress) →
/// intezkedes(ActionRequired) → lezart(Closed), +elmaradt(Cancelled).
/// Includes the unified CAPA linking (same CorrectiveAction as incidents).
/// </summary>
public class SafetyWalkTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _locationId = Guid.NewGuid();
    private readonly Guid _conductedBy = Guid.NewGuid();
    private readonly Guid _assignedTo = Guid.NewGuid();

    // ── FSM entry ────────────────────────────────────────────────────────

    [Fact]
    public void Schedule_ShouldCreateWalkInScheduledStatus()
    {
        // Act
        var walk = CreateScheduledWalk();

        // Assert
        walk.Status.Should().Be(SafetyWalkStatus.Scheduled);
        walk.LocationId.Should().Be(_locationId);
        walk.Findings.Should().BeEmpty();
    }

    [Fact]
    public void Schedule_ShouldRaiseScheduledEvent()
    {
        // Act
        var walk = CreateScheduledWalk();

        // Assert
        walk.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<SafetyWalkScheduledEvent>();
    }

    // ── Scheduled → InProgress ───────────────────────────────────────────

    [Fact]
    public void Start_ShouldTransitionFromScheduledToInProgress()
    {
        // Arrange
        var walk = CreateScheduledWalk();

        // Act
        walk.Start();

        // Assert
        walk.Status.Should().Be(SafetyWalkStatus.InProgress);
        walk.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public void Start_ShouldThrowWhenAlreadyInProgress()
    {
        // Arrange
        var walk = CreateInProgressWalk();

        // Act
        var act = () => walk.Start();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Can only start a scheduled safety walk");
    }

    // ── Findings ─────────────────────────────────────────────────────────

    [Fact]
    public void AddFinding_ShouldRecordFindingWhileInProgress()
    {
        // Arrange
        var walk = CreateInProgressWalk();

        // Act
        var finding = walk.AddFinding("Eltorlaszolt menekülőútvonal", Severity.Major, requiresAction: true);

        // Assert
        walk.Findings.Should().ContainSingle();
        finding.RequiresAction.Should().BeTrue();
        finding.Severity.Should().Be(Severity.Major);
        finding.CorrectiveActionId.Should().BeNull();
    }

    [Fact]
    public void AddFinding_ShouldThrowWhenNotInProgress()
    {
        // Arrange — still scheduled
        var walk = CreateScheduledWalk();

        // Act
        var act = () => walk.AddFinding("Hiányzó védőburkolat", Severity.Moderate, true);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Findings can only be recorded while the safety walk is in progress");
    }

    // ── Unified CAPA linking ─────────────────────────────────────────────

    [Fact]
    public void LinkFindingCorrectiveAction_ShouldLinkUnifiedCapa()
    {
        // Arrange — the SAME CorrectiveAction type incidents use
        var walk = CreateInProgressWalk();
        var finding = walk.AddFinding("Hiányzó védőburkolat", Severity.Major, requiresAction: true);

        var capa = CorrectiveAction.CreateForSafetyWalk(
            _tenantId,
            walk.SafetyWalkId,
            finding.FindingId,
            "Védőburkolat pótlása",
            _assignedTo,
            DateTimeOffset.UtcNow.AddDays(7));

        // Act
        walk.LinkFindingCorrectiveAction(finding.FindingId, capa.CorrectiveActionId);

        // Assert — finding ↔ CAPA linked; CAPA carries the SafetyWalk source
        finding.CorrectiveActionId.Should().Be(capa.CorrectiveActionId);
        capa.Source.Should().Be(CapaSource.SafetyWalk);
        capa.SourceId.Should().Be(walk.SafetyWalkId);
        capa.FindingId.Should().Be(finding.FindingId);
        capa.IncidentId.Should().BeNull();
        capa.TenantId.Should().Be(_tenantId);
    }

    [Fact]
    public void LinkFindingCorrectiveAction_ShouldThrowWhenFindingRequiresNoAction()
    {
        // Arrange
        var walk = CreateInProgressWalk();
        var finding = walk.AddFinding("Rendben lévő terület", Severity.Negligible, requiresAction: false);

        // Act
        var act = () => walk.LinkFindingCorrectiveAction(finding.FindingId, Guid.NewGuid());

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot link a corrective action to a finding that requires no action");
    }

    [Fact]
    public void LinkFindingCorrectiveAction_ShouldThrowWhenAlreadyLinked()
    {
        // Arrange
        var walk = CreateInProgressWalk();
        var finding = walk.AddFinding("Hiányzó védőburkolat", Severity.Major, requiresAction: true);
        walk.LinkFindingCorrectiveAction(finding.FindingId, Guid.NewGuid());

        // Act
        var act = () => walk.LinkFindingCorrectiveAction(finding.FindingId, Guid.NewGuid());

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Finding is already linked to a corrective action");
    }

    [Fact]
    public void IncidentSourcedCapa_ShouldCarryIncidentSource()
    {
        // Arrange — incident CAPAs go through the same unified entity
        var incident = Incident.Create(
            _tenantId, IncidentType.Accident, DateTimeOffset.UtcNow.AddHours(-1),
            "Workshop", "Test", Severity.Minor, Guid.NewGuid());
        incident.StartInvestigation(Guid.NewGuid());

        // Act
        incident.AddCorrectiveAction("Anti-slip mats", _assignedTo, DateTimeOffset.UtcNow.AddDays(7));

        // Assert
        var capa = incident.CorrectiveActions.Single();
        capa.Source.Should().Be(CapaSource.Incident);
        capa.SourceId.Should().Be(incident.IncidentId);
        capa.IncidentId.Should().Be(incident.IncidentId);
        capa.TenantId.Should().Be(_tenantId);
    }

    [Fact]
    public void MarkCompleted_ShouldThrowWhenAlreadyCompleted()
    {
        // Arrange
        var capa = CorrectiveAction.CreateForSafetyWalk(
            _tenantId, Guid.NewGuid(), Guid.NewGuid(), "CAPA", _assignedTo,
            DateTimeOffset.UtcNow.AddDays(7));
        capa.MarkCompleted();

        // Act
        var act = () => capa.MarkCompleted();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Corrective action already completed");
    }

    // ── InProgress → ActionRequired | Closed ─────────────────────────────

    [Fact]
    public void Complete_ShouldTransitionToActionRequiredWhenFindingNeedsAction()
    {
        // Arrange
        var walk = CreateInProgressWalk();
        walk.AddFinding("Hiányzó védőburkolat", Severity.Major, requiresAction: true);

        // Act
        walk.Complete();

        // Assert
        walk.Status.Should().Be(SafetyWalkStatus.ActionRequired);
        walk.CompletedAt.Should().NotBeNull();
        walk.ClosedAt.Should().BeNull();
    }

    [Fact]
    public void Complete_ShouldCloseDirectlyWhenNoActionRequired()
    {
        // Arrange
        var walk = CreateInProgressWalk();
        walk.AddFinding("Minden rendben", Severity.Negligible, requiresAction: false);

        // Act
        walk.Complete();

        // Assert
        walk.Status.Should().Be(SafetyWalkStatus.Closed);
        walk.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public void Complete_ShouldThrowWhenNotInProgress()
    {
        // Arrange
        var walk = CreateScheduledWalk();

        // Act
        var act = () => walk.Complete();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Can only complete a safety walk that is in progress");
    }

    // ── ActionRequired → Closed ──────────────────────────────────────────

    [Fact]
    public void Close_ShouldTransitionWhenAllCapasCompleted()
    {
        // Arrange
        var walk = CreateActionRequiredWalk();

        // Act
        walk.Close(allCorrectiveActionsCompleted: true);

        // Assert
        walk.Status.Should().Be(SafetyWalkStatus.Closed);
        walk.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public void Close_ShouldThrowWhenCapasOpen()
    {
        // Arrange
        var walk = CreateActionRequiredWalk();

        // Act
        var act = () => walk.Close(allCorrectiveActionsCompleted: false);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot close the safety walk while linked corrective actions are open");
    }

    [Fact]
    public void Close_ShouldThrowWhenNotActionRequired()
    {
        // Arrange
        var walk = CreateInProgressWalk();

        // Act
        var act = () => walk.Close(allCorrectiveActionsCompleted: true);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Can only close a safety walk awaiting corrective actions");
    }

    // ── Scheduled → Cancelled ────────────────────────────────────────────

    [Fact]
    public void Cancel_ShouldTransitionFromScheduledToCancelled()
    {
        // Arrange
        var walk = CreateScheduledWalk();

        // Act
        walk.Cancel();

        // Assert
        walk.Status.Should().Be(SafetyWalkStatus.Cancelled);
        walk.CancelledAt.Should().NotBeNull();
    }

    [Fact]
    public void Cancel_ShouldThrowWhenAlreadyStarted()
    {
        // Arrange
        var walk = CreateInProgressWalk();

        // Act
        var act = () => walk.Cancel();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Can only cancel a scheduled safety walk");
    }

    // Helpers
    private SafetyWalk CreateScheduledWalk()
    {
        return SafetyWalk.Schedule(
            _tenantId,
            _locationId,
            DateTimeOffset.UtcNow.AddDays(1),
            _conductedBy,
            new List<Guid> { Guid.NewGuid() });
    }

    private SafetyWalk CreateInProgressWalk()
    {
        var walk = CreateScheduledWalk();
        walk.Start();
        return walk;
    }

    private SafetyWalk CreateActionRequiredWalk()
    {
        var walk = CreateInProgressWalk();
        walk.AddFinding("Hiányzó védőburkolat", Severity.Major, requiresAction: true);
        walk.Complete();
        return walk;
    }
}
