using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.Locations.Queries.ListLocations;

public class ListLocationsQueryHandler : IRequestHandler<ListLocationsQuery, List<EhsLocationDto>>
{
    private readonly IEhsLocationRepository _repository;

    public ListLocationsQueryHandler(IEhsLocationRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<EhsLocationDto>> Handle(ListLocationsQuery request, CancellationToken ct)
    {
        var locations = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return locations.Select(location => location.ToDto()).ToList();
    }
}
