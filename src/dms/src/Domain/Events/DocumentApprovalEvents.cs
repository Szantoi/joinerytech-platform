using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Approval-workflow domain events (DMS-BE-HOST) — one per portal DOCUMENT_FSM
/// action plus creation. Grouped in one file: identical tiny shapes, one concern.
/// </summary>

/// <summary>Raised when a document is created (v1 draft working copy).</summary>
public record DocumentCreatedEvent(
    Guid DocumentId,
    Guid TenantId,
    string Name) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Raised on submit (Draft → UnderReview).</summary>
public record DocumentSubmittedForReviewEvent(
    Guid DocumentId,
    Guid TenantId,
    int VersionNumber) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Raised on approve (UnderReview → Released).</summary>
public record DocumentApprovedEvent(
    Guid DocumentId,
    Guid TenantId,
    int VersionNumber,
    string? Note) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Raised on reject (UnderReview → Draft; reason is mandatory).</summary>
public record DocumentRejectedEvent(
    Guid DocumentId,
    Guid TenantId,
    int VersionNumber,
    string Reason) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Raised on recall (Released → UnderReview — re-review starts).</summary>
public record DocumentRecalledEvent(
    Guid DocumentId,
    Guid TenantId,
    int VersionNumber,
    string? Reason) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Raised on reopen (Archived → Draft working copy).</summary>
public record DocumentReopenedEvent(
    Guid DocumentId,
    Guid TenantId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
