using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.Locations.Queries.GetLocationById;

public class GetLocationByIdQueryHandler : IRequestHandler<GetLocationByIdQuery, EhsLocationDto>
{
    private readonly IEhsLocationRepository _repository;

    public GetLocationByIdQueryHandler(IEhsLocationRepository repository)
    {
        _repository = repository;
    }

    public async Task<EhsLocationDto> Handle(GetLocationByIdQuery request, CancellationToken ct)
    {
        var location = await _repository.GetByIdAsync(request.LocationId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Location {request.LocationId} not found");

        return location.ToDto();
    }
}
