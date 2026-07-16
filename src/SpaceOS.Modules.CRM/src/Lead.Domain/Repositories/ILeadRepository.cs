using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.Repositories;

/// <summary>
/// Repository for the Lead aggregate. Implemented in the Infrastructure layer.
///
/// Extracted by CRM-BE-HOST from the bottom of <c>CreateLeadHandler.cs</c> into the
/// <c>Domain.Repositories</c> namespace the query handlers already imported (the
/// namespace did not exist, so the module never compiled).
/// </summary>
public interface ILeadRepository
{
    /// <summary>Load a lead with its activities and tasks; null if absent in the tenant.</summary>
    Task<Lead?> GetByIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken);

    /// <summary>All leads of the tenant (activities and tasks included).</summary>
    Task<List<Lead>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken);

    /// <summary>Leads of the tenant in the given status.</summary>
    Task<List<Lead>> GetByStatusAsync(Guid tenantId, LeadStatus status, CancellationToken cancellationToken);

    /// <summary>Leads of the tenant assigned to the given user.</summary>
    Task<List<Lead>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken);

    Task AddAsync(Lead lead, CancellationToken cancellationToken);

    Task UpdateAsync(Lead lead, CancellationToken cancellationToken);

    Task DeleteAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken);
}
