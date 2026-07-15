using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Locations.Queries.ListLocations;

public class ListLocationsQueryHandler : IRequestHandler<ListLocationsQuery, List<EhsLocationDto>>
{
    private readonly IEhsLocationRepository _repository;
    private readonly IMapper _mapper;

    public ListLocationsQueryHandler(IEhsLocationRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<EhsLocationDto>> Handle(ListLocationsQuery request, CancellationToken ct)
    {
        var locations = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<EhsLocationDto>>(locations);
    }
}
