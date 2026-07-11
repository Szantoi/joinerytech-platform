namespace SpaceOS.Modules.Kontrolling.Domain.Events;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Domain event raised when overhead allocation configuration is updated
/// </summary>
public sealed record OverheadConfigUpdatedEvent(
    Guid TenantId,
    OverheadAllocationMethod OldMethod,
    OverheadAllocationMethod NewMethod,
    decimal OldRate,
    decimal NewRate,
    Guid UpdatedBy,
    DateTime UpdatedAt
);
