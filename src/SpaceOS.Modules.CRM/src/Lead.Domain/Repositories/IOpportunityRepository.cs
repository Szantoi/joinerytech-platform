using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.Repositories;

/// <summary>
/// Repository for the Opportunity aggregate. Implemented in the Infrastructure layer.
///
/// Extracted by CRM-BE-HOST from the bottom of <c>ConvertToOpportunityHandler.cs</c>
/// into the <c>Domain.Repositories</c> namespace the query handlers already imported.
/// </summary>
public interface IOpportunityRepository
{
    /// <summary>Load an opportunity with its activities and tasks; null if absent in the tenant.</summary>
    Task<Opportunity?> GetByIdAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken);

    /// <summary>All opportunities of the tenant (activities and tasks included).</summary>
    Task<List<Opportunity>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken);

    /// <summary>Opportunities of the tenant in the given status.</summary>
    Task<List<Opportunity>> GetByStatusAsync(Guid tenantId, OpportunityStatus status, CancellationToken cancellationToken);

    /// <summary>Opportunities of the tenant assigned to the given user.</summary>
    Task<List<Opportunity>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken);

    /// <summary>Opportunities created from the given lead.</summary>
    Task<List<Opportunity>> GetByLeadIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken);

    Task AddAsync(Opportunity opportunity, CancellationToken cancellationToken);

    Task UpdateAsync(Opportunity opportunity, CancellationToken cancellationToken);

    Task DeleteAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken);
}
