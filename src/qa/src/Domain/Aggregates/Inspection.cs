using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.FSM;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Domain.Aggregates;

/// <summary>
/// Inspection aggregate root.
/// Represents a quality control inspection execution with FSM-enforced status transitions.
/// CRITICAL: Failed inspections with CriticalLevel.Critical block production.
/// Immutable result after completion (audit trail).
/// Rework loop (ADR-063): a Conditional completion never reopens this aggregate —
/// the repair runs in the Ticket domain and the re-check is a NEW Inspection
/// referencing the original via <see cref="ReworkOfInspectionId"/>.
/// </summary>
public class Inspection : AggregateRoot
{
    private readonly List<FailureNote> _failureNotes = new();

    public InspectionId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public QACheckpointId CheckpointId { get; private set; } = null!;
    public Guid? OrderId { get; private set; }
    public Guid? ProductId { get; private set; }
    public InspectionStatus Status { get; private set; }
    public InspectionResult Result { get; private set; }
    public Guid InspectorId { get; private set; }
    public string? Notes { get; private set; }
    public IReadOnlyList<FailureNote>? FailureNotes => _failureNotes.AsReadOnly();
    public DateTime PlannedAt { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    /// <summary>
    /// When set, this inspection is a re-check (rework verification) of the
    /// referenced inspection (ADR-063). The referenced inspection stays immutable.
    /// </summary>
    public InspectionId? ReworkOfInspectionId { get; private set; }

    // EF Core constructor
    private Inspection() { }

    private Inspection(
        InspectionId id,
        Guid tenantId,
        QACheckpointId checkpointId,
        Guid inspectorId,
        DateTime plannedAt,
        Guid? orderId = null,
        Guid? productId = null)
    {
        if (checkpointId == null)
            throw new DomainException("CheckpointId is required");
        if (inspectorId == Guid.Empty)
            throw new DomainException("InspectorId is required");
        if (plannedAt < DateTime.UtcNow.AddMinutes(-5)) // Allow 5 minute grace period
            throw new DomainException("PlannedAt must be in the future or present");

        Id = id;
        TenantId = tenantId;
        CheckpointId = checkpointId;
        InspectorId = inspectorId;
        PlannedAt = plannedAt;
        OrderId = orderId;
        ProductId = productId;
        Status = InspectionStatus.Planned;
        Result = InspectionResult.Pending;

        AddDomainEvent(new InspectionPlannedEvent(
            Id,
            TenantId,
            CheckpointId,
            InspectorId,
            PlannedAt));
    }

    /// <summary>
    /// Factory method to create a new inspection.
    /// </summary>
    public static Inspection Create(
        Guid tenantId,
        QACheckpointId checkpointId,
        Guid inspectorId,
        DateTime plannedAt,
        Guid? orderId = null,
        Guid? productId = null)
    {
        return new Inspection(
            InspectionId.New(),
            tenantId,
            checkpointId,
            inspectorId,
            plannedAt,
            orderId,
            productId);
    }

    /// <summary>
    /// Factory method for the re-check of a conditionally passed inspection (ADR-063).
    /// The original inspection stays untouched (immutable audit trail); the new
    /// inspection inherits its checkpoint/order/product scope and points back via
    /// <see cref="ReworkOfInspectionId"/>.
    /// Guard: only a Completed inspection with Conditional result can be reworked.
    /// </summary>
    public static Inspection CreateRework(
        Inspection original,
        Guid inspectorId,
        DateTime plannedAt)
    {
        if (original == null)
            throw new DomainException("Original inspection is required");
        if (original.Status != InspectionStatus.Completed || original.Result != InspectionResult.Conditional)
            throw new InvalidStatusTransitionException(
                $"Rework inspection requires a Completed inspection with Conditional result (current: {original.Status}/{original.Result})");

        var rework = new Inspection(
            InspectionId.New(),
            original.TenantId,
            original.CheckpointId,
            inspectorId,
            plannedAt,
            original.OrderId,
            original.ProductId)
        {
            ReworkOfInspectionId = original.Id
        };

        return rework;
    }

    /// <summary>
    /// Starts the inspection (FSM: Planned → InProgress).
    /// </summary>
    public void Start()
    {
        if (!InspectionStatusTransitions.IsValidTransition(Status, InspectionStatus.InProgress))
            throw new InvalidStatusTransitionException($"Cannot transition from {Status} to InProgress");

        Status = InspectionStatus.InProgress;
        StartedAt = DateTime.UtcNow;

        AddDomainEvent(new InspectionStartedEvent(
            Id,
            TenantId,
            CheckpointId,
            InspectorId));
    }

    /// <summary>
    /// Completes the inspection with Pass result (FSM: InProgress → Completed).
    /// </summary>
    public void CompleteWithPass(string? notes = null)
    {
        if (!InspectionStatusTransitions.IsValidTransition(Status, InspectionStatus.Completed))
            throw new InvalidStatusTransitionException($"Cannot transition from {Status} to Completed");

        Status = InspectionStatus.Completed;
        Result = InspectionResult.Pass;
        Notes = notes;
        CompletedAt = DateTime.UtcNow;

        AddDomainEvent(new InspectionCompletedEvent(
            Id,
            TenantId,
            CheckpointId,
            InspectionResult.Pass,
            OrderId));
    }

    /// <summary>
    /// Completes the inspection with Fail result (FSM: InProgress → Completed).
    /// CRITICAL: If checkpoint CriticalLevel == Critical, this blocks production!
    /// </summary>
    public void CompleteWithFail(List<FailureNote> failureNotes, string? notes = null)
    {
        if (!InspectionStatusTransitions.IsValidTransition(Status, InspectionStatus.Completed))
            throw new InvalidStatusTransitionException($"Cannot transition from {Status} to Completed");

        if (failureNotes == null || !failureNotes.Any())
            throw new DomainException("Failure notes are required when inspection fails");

        Status = InspectionStatus.Completed;
        Result = InspectionResult.Fail;
        _failureNotes.AddRange(failureNotes);
        Notes = notes;
        CompletedAt = DateTime.UtcNow;

        AddDomainEvent(new InspectionFailedEvent(
            Id,
            TenantId,
            CheckpointId,
            OrderId,
            failureNotes.Select(f => f.FailureType).ToList()));
    }

    /// <summary>
    /// Completes the inspection with Conditional result (FSM: InProgress → Completed) — ADR-063.
    /// "Passed with minor defects — repair and re-check": the minor defects MUST be
    /// documented (min. 1 failure note), they feed the auto-spawned rework Ticket.
    /// The inspection stays immutable after this; the repair loop runs in the Ticket
    /// domain and the re-check is a new Inspection (CreateRework).
    /// </summary>
    public void CompleteWithConditional(List<FailureNote> failureNotes, string? notes = null)
    {
        if (!InspectionStatusTransitions.IsValidTransition(Status, InspectionStatus.Completed))
            throw new InvalidStatusTransitionException($"Cannot transition from {Status} to Completed");

        if (failureNotes == null || !failureNotes.Any())
            throw new DomainException("Failure notes are required when inspection passes conditionally");

        Status = InspectionStatus.Completed;
        Result = InspectionResult.Conditional;
        _failureNotes.AddRange(failureNotes);
        Notes = notes;
        CompletedAt = DateTime.UtcNow;

        AddDomainEvent(new InspectionCompletedConditionallyEvent(
            Id,
            TenantId,
            CheckpointId,
            OrderId,
            ProductId,
            InspectorId,
            failureNotes.Select(f => f.FailureType).ToList()));
    }

    /// <summary>
    /// Adds additional failure note to a completed inspection (for audit trail).
    /// Can only be done on completed failed inspections.
    /// </summary>
    public void AddFailureNote(FailureType failureType, string description, string? photoUrl = null)
    {
        if (Status != InspectionStatus.Completed)
            throw new DomainException("Can only add failure notes to completed inspections");
        if (Result != InspectionResult.Fail)
            throw new DomainException("Can only add failure notes to failed inspections");

        var failureNote = FailureNote.Create(failureType, description, photoUrl);
        _failureNotes.Add(failureNote);
    }

    /// <summary>
    /// Updates inspector notes (allowed even after completion for audit trail).
    /// </summary>
    public void UpdateNotes(string notes)
    {
        Notes = notes;
    }
}
