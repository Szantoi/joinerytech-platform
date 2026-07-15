using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeItems;

public class ListPpeItemsQueryHandler : IRequestHandler<ListPpeItemsQuery, List<PpeItemDto>>
{
    private readonly IPpeItemRepository _repository;
    private readonly IMapper _mapper;

    public ListPpeItemsQueryHandler(IPpeItemRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<PpeItemDto>> Handle(ListPpeItemsQuery request, CancellationToken ct)
    {
        var items = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<PpeItemDto>>(items);
    }
}
