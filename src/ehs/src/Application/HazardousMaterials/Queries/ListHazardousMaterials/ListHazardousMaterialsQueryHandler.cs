using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.ListHazardousMaterials;

public class ListHazardousMaterialsQueryHandler
    : IRequestHandler<ListHazardousMaterialsQuery, List<HazardousMaterialListItemDto>>
{
    private readonly IHazardousMaterialRepository _repository;
    private readonly IMapper _mapper;

    public ListHazardousMaterialsQueryHandler(IHazardousMaterialRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<HazardousMaterialListItemDto>> Handle(
        ListHazardousMaterialsQuery request, CancellationToken ct)
    {
        var materials = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<HazardousMaterialListItemDto>>(materials);
    }
}
