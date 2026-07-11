using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.ListRiskAssessments;

public class ListRiskAssessmentsQueryHandler : IRequestHandler<ListRiskAssessmentsQuery, List<RiskAssessmentListItemDto>>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly IMapper _mapper;

    public ListRiskAssessmentsQueryHandler(IRiskAssessmentRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<RiskAssessmentListItemDto>> Handle(ListRiskAssessmentsQuery request, CancellationToken ct)
    {
        var riskAssessments = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<RiskAssessmentListItemDto>>(riskAssessments);
    }
}
