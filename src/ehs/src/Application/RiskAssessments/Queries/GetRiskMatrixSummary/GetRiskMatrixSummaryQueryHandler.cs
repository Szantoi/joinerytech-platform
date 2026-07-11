using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskMatrixSummary;

public class GetRiskMatrixSummaryQueryHandler : IRequestHandler<GetRiskMatrixSummaryQuery, RiskMatrixSummaryDto>
{
    private readonly IRiskAssessmentRepository _repository;

    public GetRiskMatrixSummaryQueryHandler(IRiskAssessmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<RiskMatrixSummaryDto> Handle(GetRiskMatrixSummaryQuery request, CancellationToken ct)
    {
        var summary = await _repository.GetRiskMatrixSummaryAsync(request.TenantId, ct).ConfigureAwait(false);

        return summary;
    }
}
