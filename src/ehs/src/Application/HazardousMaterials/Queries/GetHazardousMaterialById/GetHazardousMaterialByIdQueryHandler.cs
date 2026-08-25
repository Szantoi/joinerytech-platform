using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetHazardousMaterialById;

public class GetHazardousMaterialByIdQueryHandler
    : IRequestHandler<GetHazardousMaterialByIdQuery, HazardousMaterialDto>
{
    private readonly IHazardousMaterialRepository _repository;

    public GetHazardousMaterialByIdQueryHandler(IHazardousMaterialRepository repository)
    {
        _repository = repository;
    }

    public async Task<HazardousMaterialDto> Handle(GetHazardousMaterialByIdQuery request, CancellationToken ct)
    {
        var material = await _repository.GetByIdAsync(request.MaterialId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Hazardous material {request.MaterialId} not found");

        return material.ToDto();
    }
}
