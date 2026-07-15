using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for PpeIssuance aggregate (PPE hand-outs, FSM).
/// </summary>
public class PpeIssuanceRepository : IPpeIssuanceRepository
{
    private readonly EhsDbContext _context;

    public PpeIssuanceRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get issuance by ID with tenant filtering.</summary>
    public async Task<PpeIssuance?> GetByIdAsync(Guid issuanceId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.PpeIssuances
            .FirstOrDefaultAsync(i => i.IssuanceId == issuanceId && i.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// List issuances with filtering (employee, status, expiring window).
    /// ExpiringWithinDays keeps only outstanding (Issued/Acknowledged) items
    /// whose ExpiresAt falls within the window — including already expired ones.
    /// </summary>
    public async Task<List<PpeIssuance>> ListAsync(PpeIssuanceFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.PpeIssuances
            .Where(i => i.TenantId == tenantId);

        if (filter.EmployeeId.HasValue)
            query = query.Where(i => i.EmployeeId == filter.EmployeeId.Value);

        if (filter.Status.HasValue)
            query = query.Where(i => i.Status == filter.Status.Value);

        if (filter.ExpiringWithinDays.HasValue)
        {
            var limit = DateTimeOffset.UtcNow.AddDays(filter.ExpiringWithinDays.Value);

            query = query.Where(i =>
                i.ExpiresAt != null
                && i.ExpiresAt <= limit
                && (i.Status == PpeIssuanceStatus.Issued || i.Status == PpeIssuanceStatus.Acknowledged));
        }

        return await query
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(PpeIssuance issuance, CancellationToken ct = default)
    {
        await _context.PpeIssuances.AddAsync(issuance, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(PpeIssuance issuance, CancellationToken ct = default)
    {
        _context.PpeIssuances.Update(issuance);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Persist a replacement atomically — old update + new insert in ONE SaveChanges
    /// so a crash cannot leave a Replaced issuance without its replacement.
    /// </summary>
    public async Task AddReplacementAsync(PpeIssuance replaced, PpeIssuance replacement, CancellationToken ct = default)
    {
        _context.PpeIssuances.Update(replaced);
        await _context.PpeIssuances.AddAsync(replacement, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
