using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Repositories;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="ILeadRepository"/>.
/// Every read is tenant-filtered (defence in depth alongside PostgreSQL RLS);
/// owned collections load with the aggregate, so no explicit Include is needed.
/// </summary>
public sealed class LeadRepository : ILeadRepository
{
    private readonly CrmDbContext _context;

    public LeadRepository(CrmDbContext context)
    {
        _context = context;
    }

    public Task<Lead?> GetByIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken)
        => _context.Leads
            .FirstOrDefaultAsync(l => l.TenantId == tenantId && l.Id == leadId, cancellationToken);

    public Task<List<Lead>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken)
        => _context.Leads
            .Where(l => l.TenantId == tenantId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<List<Lead>> GetByStatusAsync(Guid tenantId, LeadStatus status, CancellationToken cancellationToken)
        => _context.Leads
            .Where(l => l.TenantId == tenantId && l.Status == status)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<List<Lead>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
        => _context.Leads
            .Where(l => l.TenantId == tenantId && l.AssignedTo == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Lead lead, CancellationToken cancellationToken)
    {
        await _context.Leads.AddAsync(lead, cancellationToken).ConfigureAwait(false);
        await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task UpdateAsync(Lead lead, CancellationToken cancellationToken)
    {
        _context.Leads.Update(lead);
        await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task DeleteAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken)
    {
        var lead = await GetByIdAsync(tenantId, leadId, cancellationToken).ConfigureAwait(false);
        if (lead is null)
        {
            return;
        }

        _context.Leads.Remove(lead);
        await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
