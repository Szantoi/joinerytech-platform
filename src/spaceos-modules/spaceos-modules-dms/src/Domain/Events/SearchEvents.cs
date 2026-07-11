using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// A document search has been performed (for analytics/audit).
/// </summary>
public record DocumentSearchedEvent(
    TenantId TenantId,
    UserId UserId,
    string Query,
    int ResultCount,
    DateTime SearchedAt) : DomainEvent;
