using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetExpiringSds;

public class GetExpiringSdsQueryHandler
    : IRequestHandler<GetExpiringSdsQuery, List<HazardousMaterialListItemDto>>
{
    private readonly IHazardousMaterialRepository _repository;

    public GetExpiringSdsQueryHandler(IHazardousMaterialRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<HazardousMaterialListItemDto>> Handle(GetExpiringSdsQuery request, CancellationToken ct)
    {
        var materials = await _repository
            .ListExpiringSdsAsync(request.WithinDays, request.TenantId, ct)
            .ConfigureAwait(false);

        return materials.Select(material => material.ToListItemDto()).ToList();
    }
}
