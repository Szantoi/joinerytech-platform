using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;

namespace SpaceOS.Modules.CRM.Infrastructure.Repositories;

/// <summary>
/// EF Core implementation of ILeadRepository
/// </summary>
public class LeadRepository : ILeadRepository
{
    private readonly CrmDbContext _context;

    public LeadRepository(CrmDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<Lead?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Leads
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Lead>> GetByStatusAsync(string status, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.Leads.AsNoTracking();

        // Filter by tenant
        query = query.Where(l => l.TenantId == tenantId);

        // Filter by status if provided (empty string returns all)
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<LeadState>(status, ignoreCase: true, out var leadState))
            {
                query = query.Where(l => l.Status == leadState);
            }
        }

        return await query.ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Lead>> GetByAssignedUserAsync(Guid userId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Leads
            .AsNoTracking()
            .Where(l => l.TenantId == tenantId && l.AssignedTo == userId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(Lead lead, CancellationToken ct = default)
    {
        await _context.Leads.AddAsync(lead, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(Lead lead, CancellationToken ct = default)
    {
        _context.Leads.Update(lead);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
