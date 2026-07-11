namespace JoineryTech.CRM.Domain.Repositories;

using JoineryTech.CRM.Domain.Aggregates;
using JoineryTech.CRM.Domain.ValueObjects;
using JoineryTech.CRM.Domain.Enums;
using JoineryTech.SharedKernel;

/// <summary>
/// Repository contract for Lead aggregate
/// </summary>
public interface ILeadRepository
{
    // ============ QUERIES ============

    /// <summary>
    /// Get lead by ID (with RLS enforcement)
    /// </summary>
    Task<Lead?> GetByIdAsync(LeadId id, CancellationToken ct = default);

    /// <summary>
    /// Get all leads by status (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Lead>> GetByStatusAsync(LeadStatus status, CancellationToken ct = default);

    /// <summary>
    /// Get all leads assigned to a specific user (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Lead>> GetByAssignedUserAsync(UserId userId, CancellationToken ct = default);

    /// <summary>
    /// Get leads by source (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Lead>> GetBySourcesAsync(List<LeadSource> sources, CancellationToken ct = default);

    /// <summary>
    /// Get paged leads with optional filters (with RLS enforcement)
    /// </summary>
    Task<PagedResult<Lead>> GetPagedAsync(
        int page,
        int pageSize,
        LeadStatus? statusFilter = null,
        UserId? assignedToFilter = null,
        CancellationToken ct = default);

    // ============ COMMANDS ============

    /// <summary>
    /// Add new lead (domain events not persisted here - use event bus)
    /// </summary>
    Task AddAsync(Lead lead, CancellationToken ct = default);

    /// <summary>
    /// Update existing lead (domain events not persisted here - use event bus)
    /// </summary>
    Task UpdateAsync(Lead lead, CancellationToken ct = default);

    // ============ VALIDATION ============

    /// <summary>
    /// Check if email already exists for this tenant (unique constraint)
    /// </summary>
    Task<bool> EmailExistsAsync(Email email, TenantId tenantId, CancellationToken ct = default);

    // ============ AGGREGATE LOADING ============

    /// <summary>
    /// Get lead by ID with all child entities loaded (Activities)
    /// Use when full aggregate is needed (e.g., scoring, conversion)
    /// </summary>
    Task<Lead?> GetByIdWithActivitiesAsync(LeadId id, CancellationToken ct = default);
}
