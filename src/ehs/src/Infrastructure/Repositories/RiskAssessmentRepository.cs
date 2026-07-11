using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for RiskAssessment aggregate.
/// Provides risk assessment listing, filtering, 5×5 risk matrix aggregations, and CRUD operations.
/// ISO 45001 compliant.
/// </summary>
public class RiskAssessmentRepository : IRiskAssessmentRepository
{
    private readonly EhsDbContext _context;

    public RiskAssessmentRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get risk assessment by ID with tenant filtering and owned entities loaded.
    /// </summary>
    public async Task<RiskAssessment?> GetByIdAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.RiskAssessments
            .FirstOrDefaultAsync(r => r.RiskAssessmentId == riskAssessmentId && r.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// List risk assessments with filtering support.
    /// Filters: RiskLevel, Status, ReviewDueBefore
    /// </summary>
    public async Task<List<RiskAssessment>> ListAsync(RiskAssessmentFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.RiskAssessments
            .Where(r => r.TenantId == tenantId);

        if (filter.RiskLevel.HasValue)
            query = query.Where(r => r.RiskLevel == filter.RiskLevel.Value);

        if (filter.Status.HasValue)
            query = query.Where(r => r.Status == filter.Status.Value);

        if (filter.ReviewDueBefore.HasValue)
            query = query.Where(r => r.ReviewDueDate <= filter.ReviewDueBefore.Value);

        return await query
            .OrderByDescending(r => r.RiskScore)
            .ThenBy(r => r.ReviewDueDate)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Get 5×5 risk matrix data (Severity × Likelihood → Count).
    /// Returns RiskMatrixData with cell counts for visualization.
    /// </summary>
    public async Task<RiskMatrixData> GetRiskMatrixAsync(Guid tenantId, CancellationToken ct = default)
    {
        var assessments = await _context.RiskAssessments
            .Where(r => r.TenantId == tenantId && r.Status == RiskStatus.Active)
            .Select(r => new { r.Severity, r.Likelihood })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var cellCounts = assessments
            .GroupBy(r => (r.Severity, r.Likelihood))
            .ToDictionary(g => g.Key, g => g.Count());

        return new RiskMatrixData(cellCounts);
    }

    /// <summary>
    /// Get risk matrix summary with DTO format (RiskMatrixCellDto list).
    /// Materializes all 25 cells (5 Severity × 5 Likelihood) including empty cells (count=0).
    /// </summary>
    public async Task<RiskMatrixSummaryDto> GetRiskMatrixSummaryAsync(Guid tenantId, CancellationToken ct = default)
    {
        var assessments = await _context.RiskAssessments
            .Where(r => r.TenantId == tenantId && r.Status == RiskStatus.Active)
            .Select(r => new { r.Severity, r.Likelihood, r.RiskLevel, r.Status })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var total = assessments.Count;

        // Aggregate by risk level
        var byRiskLevel = assessments
            .GroupBy(r => r.RiskLevel.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        // Aggregate by status
        var byStatus = assessments
            .GroupBy(r => r.Status.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var cells = new List<RiskMatrixCellDto>();

        // Generate all 25 cells (5×5 matrix)
        for (int severity = 1; severity <= 5; severity++)
        {
            for (int likelihood = 1; likelihood <= 5; likelihood++)
            {
                var sev = (Severity)severity;
                var like = (Likelihood)likelihood;
                var riskScore = severity * likelihood;

                // Calculate RiskLevel from score
                var riskLevel = riskScore switch
                {
                    >= 1 and <= 5 => RiskLevel.Low,
                    >= 6 and <= 12 => RiskLevel.Medium,
                    >= 15 and <= 25 => RiskLevel.High,
                    _ => RiskLevel.Low
                };

                var count = assessments.Count(r => r.Severity == sev && r.Likelihood == like);

                cells.Add(new RiskMatrixCellDto(
                    sev,
                    like,
                    count,
                    riskLevel
                ));
            }
        }

        return new RiskMatrixSummaryDto(total, byRiskLevel, byStatus, cells);
    }

    /// <summary>
    /// Add a new risk assessment to the database.
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
