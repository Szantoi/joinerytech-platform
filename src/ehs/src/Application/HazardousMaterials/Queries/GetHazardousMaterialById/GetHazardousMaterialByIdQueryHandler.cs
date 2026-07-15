using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetHazardousMaterialById;

public class GetHazardousMaterialByIdQueryHandler
    : IRequestHandler<GetHazardousMaterialByIdQuery, HazardousMaterialDto>
{
    private readonly IHazardousMaterialRepository _repository;
    private readonly IMapper _mapper;

    public GetHazardousMaterialByIdQueryHandler(IHazardousMaterialRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<HazardousMaterialDto> Handle(GetHazardousMaterialByIdQuery request, CancellationToken ct)
    {
        var material = await _repository.GetByIdAsync(request.MaterialId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Hazardous material {request.MaterialId} not found");

        return _mapper.Map<HazardousMaterialDto>(material);
    }
}
