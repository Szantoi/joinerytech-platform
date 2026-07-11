using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;

namespace SpaceOS.Modules.CRM.Infrastructure.Repositories;

/// <summary>
/// EF Core implementation of IOpportunityRepository
/// </summary>
public class OpportunityRepository : IOpportunityRepository
{
    private readonly CrmDbContext _context;

    public OpportunityRepository(CrmDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<Opportunity?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Opportunities
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<Opportunity?> GetByConversionIdAsync(Guid conversionId, CancellationToken ct = default)
    {
        return await _context.Opportunities
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.ConversionId == conversionId, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Opportunity>> GetByStatusAsync(string status, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.Opportunities.AsNoTracking();

        // Filter by tenant
        query = query.Where(o => o.TenantId == tenantId);

        // Filter by status if provided (empty string returns all)
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<OpportunityStatus>(status, ignoreCase: true, out var oppStatus))
            {
                query = query.Where(o => o.Status == oppStatus);
            }
        }

        return await query.ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Opportunity>> GetAllAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Opportunities
            .AsNoTracking()
            .Where(o => o.TenantId == tenantId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(Opportunity opportunity, CancellationToken ct = default)
    {
        await _context.Opportunities.AddAsync(opportunity, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(Opportunity opportunity, CancellationToken ct = default)
    {
        _context.Opportunities.Update(opportunity);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task<IEnumerable<Opportunity>> GetConvertingOpportunitiesOlderThanAsync(TimeSpan timeout, CancellationToken ct = default)
    {
        var cutoffTime = DateTime.UtcNow.Subtract(timeout);

        return await _context.Opportunities
            .Where(o => o.Status == OpportunityStatus.Converting &&
                        o.ConversionStartedAt.HasValue &&
                        o.ConversionStartedAt.Value < cutoffTime)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }
}
