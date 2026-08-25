using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskAssessmentById;

public class GetRiskAssessmentByIdQueryHandler : IRequestHandler<GetRiskAssessmentByIdQuery, RiskAssessmentDto?>
{
    private readonly IRiskAssessmentRepository _repository;

    public GetRiskAssessmentByIdQueryHandler(IRiskAssessmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<RiskAssessmentDto?> Handle(GetRiskAssessmentByIdQuery request, CancellationToken ct)
    {
        var riskAssessment = await _repository.GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct).ConfigureAwait(false);

        return riskAssessment?.ToDto();
    }
}
