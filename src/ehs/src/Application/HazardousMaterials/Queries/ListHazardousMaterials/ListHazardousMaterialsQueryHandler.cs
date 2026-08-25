using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.ListHazardousMaterials;

public class ListHazardousMaterialsQueryHandler
    : IRequestHandler<ListHazardousMaterialsQuery, List<HazardousMaterialListItemDto>>
{
    private readonly IHazardousMaterialRepository _repository;

    public ListHazardousMaterialsQueryHandler(IHazardousMaterialRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<HazardousMaterialListItemDto>> Handle(
        ListHazardousMaterialsQuery request, CancellationToken ct)
    {
        var materials = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return materials.Select(material => material.ToListItemDto()).ToList();
    }
}
