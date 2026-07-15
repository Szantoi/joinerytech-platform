using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.GetPpeIssuanceById;

public class GetPpeIssuanceByIdQueryHandler : IRequestHandler<GetPpeIssuanceByIdQuery, PpeIssuanceDto>
{
    private readonly IPpeIssuanceRepository _repository;
    private readonly IMapper _mapper;

    public GetPpeIssuanceByIdQueryHandler(IPpeIssuanceRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<PpeIssuanceDto> Handle(GetPpeIssuanceByIdQuery request, CancellationToken ct)
    {
        var issuance = await _repository.GetByIdAsync(request.IssuanceId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE issuance {request.IssuanceId} not found");

        return _mapper.Map<PpeIssuanceDto>(issuance);
    }
}
