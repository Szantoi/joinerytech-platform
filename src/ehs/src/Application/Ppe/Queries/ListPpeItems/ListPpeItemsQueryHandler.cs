using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeItems;

public class ListPpeItemsQueryHandler : IRequestHandler<ListPpeItemsQuery, List<PpeItemDto>>
{
    private readonly IPpeItemRepository _repository;

    public ListPpeItemsQueryHandler(IPpeItemRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<PpeItemDto>> Handle(ListPpeItemsQuery request, CancellationToken ct)
    {
        var items = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return items.Select(item => item.ToDto()).ToList();
    }
}
