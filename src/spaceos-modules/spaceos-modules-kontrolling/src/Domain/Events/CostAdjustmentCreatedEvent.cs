namespace SpaceOS.Modules.Kontrolling.Domain.Events;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Domain event raised when a cost adjustment is created
/// </summary>
public sealed record CostAdjustmentCreatedEvent(
    Guid AdjustmentId,
    Guid TenantId,
    Guid? ProjectId,
    CostCategory Category,
    decimal Amount,
    string Currency,
    AdjustmentScope Scope,
    string Reason,
    Guid CreatedBy,
    DateTime CreatedAt
);
