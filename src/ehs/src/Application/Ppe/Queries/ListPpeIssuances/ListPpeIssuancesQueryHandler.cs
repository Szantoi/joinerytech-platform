using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeIssuances;

public class ListPpeIssuancesQueryHandler : IRequestHandler<ListPpeIssuancesQuery, List<PpeIssuanceDto>>
{
    private readonly IPpeIssuanceRepository _repository;
    private readonly IMapper _mapper;

    public ListPpeIssuancesQueryHandler(IPpeIssuanceRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<PpeIssuanceDto>> Handle(ListPpeIssuancesQuery request, CancellationToken ct)
    {
        var issuances = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<PpeIssuanceDto>>(issuances);
    }
}
