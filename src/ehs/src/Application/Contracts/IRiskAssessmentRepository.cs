using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for RiskAssessment aggregate
/// Implementation in Infrastructure layer (Week 3)
/// </summary>
public interface IRiskAssessmentRepository
{
    Task<RiskAssessment?> GetByIdAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default);
    Task<List<RiskAssessment>> ListAsync(RiskAssessmentFilter filter, Guid tenantId, CancellationToken ct = default);
    Task<RiskMatrixData> GetRiskMatrixAsync(Guid tenantId, CancellationToken ct = default);
    Task<RiskMatrixSummaryDto> GetRiskMatrixSummaryAsync(Guid tenantId, CancellationToken ct = default);
    Task AddAsync(RiskAssessment assessment, CancellationToken ct = default);
    Task UpdateAsync(RiskAssessment assessment, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default);
}

public record RiskAssessmentFilter(
    RiskLevel? RiskLevel = null,
    RiskStatus? Status = null,
    DateTimeOffset? ReviewDueBefore = null
);

public record RiskMatrixData(
    Dictionary<(Severity Severity, Likelihood Likelihood), int> CellCounts
);
