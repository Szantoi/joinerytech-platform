using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for the UNIFIED CAPA registry (CorrectiveAction).
/// One table serves the single CAPA board regardless of source
/// (incident, safety walk, risk assessment).
/// </summary>
public class CorrectiveActionRepository : ICorrectiveActionRepository
{
    private readonly EhsDbContext _context;

    public CorrectiveActionRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get CAPA by ID with tenant filtering.</summary>
    public async Task<CorrectiveAction?> GetByIdAsync(Guid correctiveActionId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.CorrectiveActions
            .FirstOrDefaultAsync(a => a.CorrectiveActionId == correctiveActionId && a.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>Unified CAPA board list with filtering (completed, assignee, source).</summary>
    public async Task<List<CorrectiveAction>> ListAsync(CapaFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.CorrectiveActions
            .Where(a => a.TenantId == tenantId);

        if (filter.Completed.HasValue)
        {
            query = filter.Completed.Value
                ? query.Where(a => a.CompletedAt != null)
                : query.Where(a => a.CompletedAt == null);
        }

        if (filter.AssignedTo.HasValue)
            query = query.Where(a => a.AssignedTo == filter.AssignedTo.Value);

        if (filter.Source.HasValue)
            query = query.Where(a => a.Source == filter.Source.Value);

        if (filter.SourceId.HasValue)
            query = query.Where(a => a.SourceId == filter.SourceId.Value);

        return await query
            .OrderBy(a => a.DueDate)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(CorrectiveAction action, CancellationToken ct = default)
    {
        await _context.CorrectiveActions.AddAsync(action, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(CorrectiveAction action, CancellationToken ct = default)
    {
        _context.CorrectiveActions.Update(action);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>SafetyWalk close guard: every CAPA of the source must be completed.</summary>
    public async Task<bool> AllCompletedForSourceAsync(Guid sourceId, Guid tenantId, CancellationToken ct = default)
    {
        return !await _context.CorrectiveActions
            .AnyAsync(a => a.SourceId == sourceId && a.TenantId == tenantId && a.CompletedAt == null, ct)
            .ConfigureAwait(false);
    }
}
