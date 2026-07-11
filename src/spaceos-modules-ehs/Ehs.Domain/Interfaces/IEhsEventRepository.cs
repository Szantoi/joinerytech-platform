// Ehs.Domain/Interfaces/IEhsEventRepository.cs

using Ehs.Domain.Aggregates;
using Ehs.Domain.ValueObjects;

namespace Ehs.Domain.Interfaces;

/// <summary>
/// Repository interface for EHS event store operations.
/// </summary>
public interface IEhsEventRepository
{
    /// <summary>
    /// Get an event by its ID (for idempotency check).
    /// </summary>
    Task<EhsEvent?> GetByEventIdAsync(EventId eventId, Guid tenantId, CancellationToken ct);

    /// <summary>
    /// Insert a new event into the event store (append-only).
    /// </summary>
    Task AddAsync(EhsEvent ehsEvent, CancellationToken ct);

    /// <summary>
    /// Get all events for a tenant (for debugging/audit).
    /// </summary>
    Task<List<EhsEvent>> GetAllForTenantAsync(Guid tenantId, int limit, CancellationToken ct);
}
