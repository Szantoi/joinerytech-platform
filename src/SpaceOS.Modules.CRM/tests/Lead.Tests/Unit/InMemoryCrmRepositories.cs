using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Tests.Unit;

/// <summary>
/// In-memory repository doubles for the handler tests — no database, no Docker
/// (QA "mock repository" unit-test precedent). They hold the real aggregates, so
/// the handlers exercise genuine domain behaviour.
/// </summary>
public sealed class InMemoryLeadRepository : ILeadRepository
{
    private readonly List<Lead> _leads = [];

    public IReadOnlyList<Lead> Items => _leads;

    /// <summary>Seeds an aggregate directly (bypasses AddAsync bookkeeping).</summary>
    public InMemoryLeadRepository Seed(params Lead[] leads)
    {
        _leads.AddRange(leads);
        return this;
    }

    public Task<Lead?> GetByIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken)
        => Task.FromResult(_leads.FirstOrDefault(l => l.TenantId == tenantId && l.Id == leadId));

    public Task<List<Lead>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken)
        => Task.FromResult(_leads.Where(l => l.TenantId == tenantId).ToList());

    public Task<List<Lead>> GetByStatusAsync(Guid tenantId, LeadStatus status, CancellationToken cancellationToken)
        => Task.FromResult(_leads.Where(l => l.TenantId == tenantId && l.Status == status).ToList());

    public Task<List<Lead>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
        => Task.FromResult(_leads.Where(l => l.TenantId == tenantId && l.AssignedTo == userId).ToList());

    public Task AddAsync(Lead lead, CancellationToken cancellationToken)
    {
        _leads.Add(lead);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Lead lead, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task DeleteAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken)
    {
        _leads.RemoveAll(l => l.TenantId == tenantId && l.Id == leadId);
        return Task.CompletedTask;
    }
}

/// <summary>In-memory <see cref="IOpportunityRepository"/> double.</summary>
public sealed class InMemoryOpportunityRepository : IOpportunityRepository
{
    private readonly List<Opportunity> _opportunities = [];

    public IReadOnlyList<Opportunity> Items => _opportunities;

    public InMemoryOpportunityRepository Seed(params Opportunity[] opportunities)
    {
        _opportunities.AddRange(opportunities);
        return this;
    }

    public Task<Opportunity?> GetByIdAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken)
        => Task.FromResult(_opportunities.FirstOrDefault(o => o.TenantId == tenantId && o.Id == opportunityId));

    public Task<List<Opportunity>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken)
        => Task.FromResult(_opportunities.Where(o => o.TenantId == tenantId).ToList());

    public Task<List<Opportunity>> GetByStatusAsync(Guid tenantId, OpportunityStatus status, CancellationToken cancellationToken)
        => Task.FromResult(_opportunities.Where(o => o.TenantId == tenantId && o.Status == status).ToList());

    public Task<List<Opportunity>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
        => Task.FromResult(_opportunities.Where(o => o.TenantId == tenantId && o.AssignedTo == userId).ToList());

    public Task<List<Opportunity>> GetByLeadIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken)
        => Task.FromResult(_opportunities.Where(o => o.TenantId == tenantId && o.LeadId == leadId).ToList());

    public Task AddAsync(Opportunity opportunity, CancellationToken cancellationToken)
    {
        _opportunities.Add(opportunity);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Opportunity opportunity, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task DeleteAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken)
    {
        _opportunities.RemoveAll(o => o.TenantId == tenantId && o.Id == opportunityId);
        return Task.CompletedTask;
    }
}
