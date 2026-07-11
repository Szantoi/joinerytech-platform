// Ehs.Infrastructure/Repositories/EhsEventRepository.cs

using Ehs.Domain.Aggregates;
using Ehs.Domain.Interfaces;
using Ehs.Domain.ValueObjects;
using Ehs.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for EHS events.
/// </summary>
public sealed class EhsEventRepository : IEhsEventRepository
{
    private readonly EhsDbContext _db;

    public EhsEventRepository(EhsDbContext db) => _db = db;

    public async Task<EhsEvent?> GetByEventIdAsync(EventId eventId, Guid tenantId, CancellationToken ct)
    {
        return await _db.EhsEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EventId == eventId && e.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(EhsEvent ehsEvent, CancellationToken ct)
    {
        await _db.EhsEvents.AddAsync(ehsEvent, ct).ConfigureAwait(false);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task<List<EhsEvent>> GetAllForTenantAsync(Guid tenantId, int limit, CancellationToken ct)
    {
        return await _db.EhsEvents
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }
}
