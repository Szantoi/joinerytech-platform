using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Locations.Queries.GetLocationById;

public class GetLocationByIdQueryHandler : IRequestHandler<GetLocationByIdQuery, EhsLocationDto>
{
    private readonly IEhsLocationRepository _repository;
    private readonly IMapper _mapper;

    public GetLocationByIdQueryHandler(IEhsLocationRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<EhsLocationDto> Handle(GetLocationByIdQuery request, CancellationToken ct)
    {
        var location = await _repository.GetByIdAsync(request.LocationId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Location {request.LocationId} not found");

        return _mapper.Map<EhsLocationDto>(location);
    }
}
