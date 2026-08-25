using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeIssuances;

public class ListPpeIssuancesQueryHandler : IRequestHandler<ListPpeIssuancesQuery, List<PpeIssuanceDto>>
{
    private readonly IPpeIssuanceRepository _repository;

    public ListPpeIssuancesQueryHandler(IPpeIssuanceRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<PpeIssuanceDto>> Handle(ListPpeIssuancesQuery request, CancellationToken ct)
    {
        var issuances = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return issuances.Select(issuance => issuance.ToDto()).ToList();
    }
}
