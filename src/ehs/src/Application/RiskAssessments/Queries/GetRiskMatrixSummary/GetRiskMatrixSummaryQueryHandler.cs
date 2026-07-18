using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskMatrixSummary;

/// <summary>
/// Handler for GetRiskMatrixSummaryQuery.
/// The repository supplies a flat projection of the non-archived assessments;
/// the 5×5 cell aggregation is domain logic (RiskMatrix.BuildCells) with the
/// config-driven band boundaries.
/// </summary>
public class GetRiskMatrixSummaryQueryHandler : IRequestHandler<GetRiskMatrixSummaryQuery, RiskMatrixSummaryDto>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly RiskBandConfiguration _bands;

    public GetRiskMatrixSummaryQueryHandler(
        IRiskAssessmentRepository repository,
        RiskBandConfiguration bands)
    {
        _repository = repository;
        _bands = bands;
    }

    public async Task<RiskMatrixSummaryDto> Handle(GetRiskMatrixSummaryQuery request, CancellationToken ct)
    {
        var projections = await _repository
            .GetMatrixProjectionAsync(request.TenantId, ct)
            .ConfigureAwait(false);

        var cells = RiskMatrix.BuildCells(
            projections.Select(p => (p.Severity, p.Likelihood)),
            _bands);

        // Breakdown dictionary keys are wire keys (ADR-059), not English member names.
        return new RiskMatrixSummaryDto(
            TotalAssessments: projections.Count,
            ByRiskLevel: projections
                .GroupBy(p => EhsWire.RiskLevel.ToWire(p.RiskLevel))
                .ToDictionary(g => g.Key, g => g.Count()),
            ByStatus: projections
                .GroupBy(p => EhsWire.RiskStatus.ToWire(p.Status))
                .ToDictionary(g => g.Key, g => g.Count()),
            MatrixCells: cells
                .Select(c => new RiskMatrixCellDto(c.Severity, c.Likelihood, c.Count, c.RiskLevel))
                .ToList());
    }
}
