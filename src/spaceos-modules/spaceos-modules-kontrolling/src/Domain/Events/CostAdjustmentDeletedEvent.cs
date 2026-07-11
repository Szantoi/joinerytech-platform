namespace SpaceOS.Modules.Kontrolling.Domain.Events;

/// <summary>
/// Domain event raised when a cost adjustment is deleted (soft delete)
/// </summary>
public sealed record CostAdjustmentDeletedEvent(
    Guid AdjustmentId,
    Guid TenantId,
    Guid? ProjectId,
    Guid DeletedBy,
    DateTime DeletedAt
);
