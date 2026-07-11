using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ardalis.Specification;

namespace JoineryTech.CRM.Domain.Repositories;

/// <summary>
/// Repository contract for Opportunity aggregate.
/// </summary>
public interface IOpportunityRepository
{
    // ========== Single Retrieval ==========

    /// <summary>
    /// Gets opportunity by ID. Returns null if not found.
    /// </summary>
    Task<Opportunity?> GetByIdAsync(OpportunityId id, CancellationToken ct);

    /// <summary>
    /// Gets opportunity by source Lead ID. Returns null if not found.
    /// </summary>
    Task<Opportunity?> GetByLeadIdAsync(LeadId leadId, CancellationToken ct);

    // ========== Queries (via Specification pattern) ==========

    /// <summary>
    /// Lists opportunities matching the specification.
    /// </summary>
    Task<IReadOnlyList<Opportunity>> ListAsync(
        ISpecification<Opportunity> spec,
        CancellationToken ct);

    /// <summary>
    /// Counts opportunities matching the specification.
    /// </summary>
    Task<int> CountAsync(
        ISpecification<Opportunity> spec,
        CancellationToken ct);

    // ========== Commands ==========

    /// <summary>
    /// Adds new opportunity to the repository.
    /// </summary>
    Task AddAsync(Opportunity opportunity, CancellationToken ct);

    /// <summary>
    /// Updates existing opportunity.
    /// </summary>
    Task UpdateAsync(Opportunity opportunity, CancellationToken ct);

    // ========== Common Specifications ==========

    /// <summary>
    /// Gets opportunities by status.
    /// </summary>
    Task<IReadOnlyList<Opportunity>> GetByStatusAsync(
        OpportunityStatus status,
        CancellationToken ct);

    /// <summary>
    /// Gets opportunities assigned to a specific user.
    /// </summary>
    Task<IReadOnlyList<Opportunity>> GetByAssignedUserAsync(
        UserId userId,
        CancellationToken ct);

    /// <summary>
    /// Gets all open opportunities (status = Open, NeedsAnalysis, Proposal, Quote, Negotiation).
    /// Excludes Won and Lost.
    /// </summary>
    Task<IReadOnlyList<Opportunity>> GetOpenOpportunitiesAsync(
        CancellationToken ct);

    /// <summary>
    /// Gets opportunities expected to close within a date range.
    /// </summary>
    Task<IReadOnlyList<Opportunity>> GetByExpectedCloseDateRangeAsync(
        DateTime startDate,
        DateTime endDate,
        CancellationToken ct);

    /// <summary>
    /// Gets opportunities with weighted value ≥ threshold (for forecasting).
    /// </summary>
    Task<IReadOnlyList<Opportunity>> GetByMinimumWeightedValueAsync(
        decimal minimumValue,
        Currency currency,
        CancellationToken ct);
}

// ========== Specification Examples (for implementation reference) ==========

/// <summary>
/// Specification for open opportunities.
/// </summary>
public sealed class OpenOpportunitiesSpec : Specification<Opportunity>
{
    public OpenOpportunitiesSpec()
    {
        Query
            .Where(o => o.Status != OpportunityStatus.Won && o.Status != OpportunityStatus.Lost)
            .OrderByDescending(o => o.Probability)
            .ThenByDescending(o => o.Value.Amount);
    }
}

/// <summary>
/// Specification for opportunities by assigned user.
/// </summary>
public sealed class OpportunitiesByUserSpec : Specification<Opportunity>
{
    public OpportunitiesByUserSpec(UserId userId)
    {
        Query
            .Where(o => o.AssignedTo == userId)
            .OrderByDescending(o => o.UpdatedAt);
    }
}

/// <summary>
/// Specification for opportunities closing soon.
/// </summary>
public sealed class OpportunitiesClosingSoonSpec : Specification<Opportunity>
{
    public OpportunitiesClosingSoonSpec(int daysAhead)
    {
        var today = DateTime.UtcNow.Date;
        var endDate = today.AddDays(daysAhead);

        Query
            .Where(o =>
                o.ExpectedCloseDate.HasValue &&
                o.ExpectedCloseDate.Value >= today &&
                o.ExpectedCloseDate.Value <= endDate &&
                o.Status != OpportunityStatus.Won &&
                o.Status != OpportunityStatus.Lost)
            .OrderBy(o => o.ExpectedCloseDate);
    }
}
