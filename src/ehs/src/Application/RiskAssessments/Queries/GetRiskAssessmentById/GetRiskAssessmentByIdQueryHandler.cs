using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskAssessmentById;

public class GetRiskAssessmentByIdQueryHandler : IRequestHandler<GetRiskAssessmentByIdQuery, RiskAssessmentDto?>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly IMapper _mapper;

    public GetRiskAssessmentByIdQueryHandler(IRiskAssessmentRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<RiskAssessmentDto?> Handle(GetRiskAssessmentByIdQuery request, CancellationToken ct)
    {
        var riskAssessment = await _repository.GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct).ConfigureAwait(false);

        return riskAssessment == null ? null : _mapper.Map<RiskAssessmentDto>(riskAssessment);
    }
}
