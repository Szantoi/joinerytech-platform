using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Repositories;

/// <summary>
/// Repository for Ticket aggregate.
/// Implements 3-param tenant scoping pattern per domain interface.
/// </summary>
public class TicketRepository : ITicketRepository
{
    private readonly QADbContext _context;

    public TicketRepository(QADbContext context)
    {
        _context = context;
    }

    public async Task<Ticket?> GetByIdAsync(TicketId id, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId, ct);
    }

    public async Task<IEnumerable<Ticket>> GetByOrderIdAsync(Guid orderId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId && t.OrderId == orderId)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Ticket>> GetByTypeAsync(TicketType ticketType, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId && t.TicketType == ticketType)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Ticket>> GetByStatusAsync(TicketStatus status, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId && t.Status == status)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Ticket>> GetByAssigneeAsync(Guid assigneeId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId && t.AssignedTo == assigneeId)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Ticket>> GetResolvedTicketsAsync(Guid tenantId, DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId &&
                       t.ResolvedAt != null &&
                       t.ResolvedAt >= fromDate &&
                       t.ResolvedAt <= toDate)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Ticket>> GetByPriorityAsync(CrmTaskPriority priority, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId && t.Priority == priority)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<Ticket>> GetUnassignedTicketsAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId &&
                       t.Status == TicketStatus.Reported &&
                       t.AssignedTo == null)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Ticket ticket, CancellationToken ct = default)
    {
        await _context.Tickets.AddAsync(ticket, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Ticket ticket, CancellationToken ct = default)
    {
        _context.Tickets.Update(ticket);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<Dictionary<Guid, int>> GetWorkloadByAssigneeAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Tickets
            .Where(t => t.TenantId == tenantId &&
                       t.AssignedTo != null &&
                       t.Status != TicketStatus.Resolved &&
                       t.Status != TicketStatus.Rejected)
            .GroupBy(t => t.AssignedTo!.Value)
            .Select(g => new { AssigneeId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AssigneeId, x => x.Count, ct);
    }
}
