using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Repositories;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;

namespace SpaceOS.Modules.CRM.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IOpportunityRepository"/>.
/// Every read is tenant-filtered (defence in depth alongside PostgreSQL RLS).
/// </summary>
public sealed class OpportunityRepository : IOpportunityRepository
{
    private readonly CrmDbContext _context;

    public OpportunityRepository(CrmDbContext context)
    {
        _context = context;
    }

    public Task<Opportunity?> GetByIdAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken)
        => _context.Opportunities
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == opportunityId, cancellationToken);

    public Task<List<Opportunity>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken)
        => _context.Opportunities
            .Where(o => o.TenantId == tenantId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<List<Opportunity>> GetByStatusAsync(Guid tenantId, OpportunityStatus status, CancellationToken cancellationToken)
        => _context.Opportunities
            .Where(o => o.TenantId == tenantId && o.Status == status)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<List<Opportunity>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
        => _context.Opportunities
            .Where(o => o.TenantId == tenantId && o.AssignedTo == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<List<Opportunity>> GetByLeadIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken)
        => _context.Opportunities
            .Where(o => o.TenantId == tenantId && o.LeadId == leadId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Opportunity opportunity, CancellationToken cancellationToken)
    {
        await _context.Opportunities.AddAsync(opportunity, cancellationToken).ConfigureAwait(false);
        await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task UpdateAsync(Opportunity opportunity, CancellationToken cancellationToken)
    {
        _context.Opportunities.Update(opportunity);
        await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task DeleteAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken)
    {
        var opportunity = await GetByIdAsync(tenantId, opportunityId, cancellationToken).ConfigureAwait(false);
        if (opportunity is null)
        {
            return;
        }

        _context.Opportunities.Remove(opportunity);
        await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
