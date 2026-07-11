using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Repositories;

/// <summary>
/// Repository interface for Ticket aggregate.
/// Persistence contract for ticket CRUD and query operations.
/// </summary>
public interface ITicketRepository
{
    /// <summary>
    /// Gets a ticket by ID with tenant filtering.
    /// </summary>
    Task<Ticket?> GetByIdAsync(
        TicketId id,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets tickets by order ID.
    /// </summary>
    Task<IEnumerable<Ticket>> GetByOrderIdAsync(
        Guid orderId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets tickets by type for routing analysis.
    /// </summary>
    Task<IEnumerable<Ticket>> GetByTypeAsync(
        TicketType ticketType,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets tickets by status (for workflow tracking).
    /// </summary>
    Task<IEnumerable<Ticket>> GetByStatusAsync(
        TicketStatus status,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets tickets assigned to a specific user.
    /// </summary>
    Task<IEnumerable<Ticket>> GetByAssigneeAsync(
        Guid assigneeId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets resolved tickets in date range (for root cause analysis).
    /// </summary>
    Task<IEnumerable<Ticket>> GetResolvedTicketsAsync(
        Guid tenantId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken ct = default);

    /// <summary>
    /// Gets tickets by priority for escalation tracking.
    /// </summary>
    Task<IEnumerable<Ticket>> GetByPriorityAsync(
        CrmTaskPriority priority,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets unassigned tickets (Reported status, no assignee).
    /// Used by TicketRoutingService for auto-assignment.
    /// </summary>
    Task<IEnumerable<Ticket>> GetUnassignedTicketsAsync(
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Adds a new ticket.
    /// </summary>
    Task AddAsync(Ticket ticket, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing ticket.
    /// </summary>
    Task UpdateAsync(Ticket ticket, CancellationToken ct = default);

    /// <summary>
    /// Gets ticket count by assignee (for workload balancing).
    /// </summary>
    Task<Dictionary<Guid, int>> GetWorkloadByAssigneeAsync(
        Guid tenantId,
        CancellationToken ct = default);
}
