using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for the RiskAssessment aggregate.
/// Matrix aggregation (5×5 cells) is DOMAIN logic (RiskMatrix.BuildCells) — the
/// repository only supplies the flat projection the calculation needs.
/// </summary>
public interface IRiskAssessmentRepository
{
    Task<RiskAssessment?> GetByIdAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default);

    Task<List<RiskAssessment>> ListAsync(RiskAssessmentFilter filter, Guid tenantId, CancellationToken ct = default);

    /// <summary>
    /// Flat projection of the non-archived assessments for the 5×5 matrix summary
    /// (per-cell counts + level/status breakdowns are computed by the query handler).
    /// </summary>
    Task<List<RiskMatrixProjection>> GetMatrixProjectionAsync(Guid tenantId, CancellationToken ct = default);

    Task AddAsync(RiskAssessment assessment, CancellationToken ct = default);
    Task UpdateAsync(RiskAssessment assessment, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default);
}

/// <summary>List filter — every member optional (szint / státusz / lokáció / felülvizsgálati határidő)</summary>
public record RiskAssessmentFilter(
    RiskLevel? RiskLevel = null,
    RiskStatus? Status = null,
    Guid? LocationId = null,
    DateTimeOffset? ReviewDueBefore = null
);

/// <summary>One assessment's coordinates for the matrix summary calculation</summary>
public record RiskMatrixProjection(
    Severity Severity,
    Likelihood Likelihood,
    RiskLevel RiskLevel,
    RiskStatus Status
);
