using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.ListRiskAssessments;

public class ListRiskAssessmentsQueryHandler : IRequestHandler<ListRiskAssessmentsQuery, List<RiskAssessmentListItemDto>>
{
    private readonly IRiskAssessmentRepository _repository;

    public ListRiskAssessmentsQueryHandler(IRiskAssessmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<RiskAssessmentListItemDto>> Handle(ListRiskAssessmentsQuery request, CancellationToken ct)
    {
        var riskAssessments = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return riskAssessments.Select(riskAssessment => riskAssessment.ToListItemDto()).ToList();
    }
}
