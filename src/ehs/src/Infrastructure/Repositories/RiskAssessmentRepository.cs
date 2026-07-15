using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for the RiskAssessment aggregate.
/// Listing/filtering runs SQL-side; the 5×5 matrix aggregation itself is domain
/// logic (RiskMatrix.BuildCells) — this class only supplies the flat projection.
/// </summary>
public class RiskAssessmentRepository : IRiskAssessmentRepository
{
    private readonly EhsDbContext _context;

    public RiskAssessmentRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get risk assessment by ID with tenant filtering (controls are owned entities — auto-included).
    /// </summary>
    public async Task<RiskAssessment?> GetByIdAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.RiskAssessments
            .FirstOrDefaultAsync(r => r.RiskAssessmentId == riskAssessmentId && r.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// List risk assessments with SQL-side filtering.
    /// Filters: RiskLevel, Status, LocationId, ReviewDueBefore.
    /// </summary>
    public async Task<List<RiskAssessment>> ListAsync(RiskAssessmentFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.RiskAssessments
            .Where(r => r.TenantId == tenantId);

        if (filter.RiskLevel.HasValue)
            query = query.Where(r => r.RiskLevel == filter.RiskLevel.Value);

        if (filter.Status.HasValue)
            query = query.Where(r => r.Status == filter.Status.Value);

        if (filter.LocationId.HasValue)
            query = query.Where(r => r.LocationId == filter.LocationId.Value);

        if (filter.ReviewDueBefore.HasValue)
            query = query.Where(r => r.ReviewDueDate <= filter.ReviewDueBefore.Value);

        return await query
            .OrderByDescending(r => r.RiskScore)
            .ThenBy(r => r.ReviewDueDate)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Flat projection of the non-archived assessments for the 5×5 matrix summary.
    /// Archived entries are excluded — the dashboard shows the live risk register.
    /// </summary>
    public async Task<List<RiskMatrixProjection>> GetMatrixProjectionAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.RiskAssessments
            .Where(r => r.TenantId == tenantId && r.Status != RiskStatus.Archived)
            .Select(r => new RiskMatrixProjection(r.Severity, r.Likelihood, r.RiskLevel, r.Status))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Add a new risk assessment.
    /// </summary>
    public async Task AddAsync(RiskAssessment assessment, CancellationToken ct = default)
    {
        await _context.RiskAssessments.AddAsync(assessment, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Update an existing risk assessment.
    /// </summary>
    public async Task UpdateAsync(RiskAssessment assessment, CancellationToken ct = default)
    {
        _context.RiskAssessments.Update(assessment);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Check if a risk assessment exists with the given ID and tenant.
    /// </summary>
    public async Task<bool> ExistsAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.RiskAssessments
            .AnyAsync(r => r.RiskAssessmentId == riskAssessmentId && r.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }
}
