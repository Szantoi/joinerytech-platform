using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetExpiringSds;

public class GetExpiringSdsQueryHandler
    : IRequestHandler<GetExpiringSdsQuery, List<HazardousMaterialListItemDto>>
{
    private readonly IHazardousMaterialRepository _repository;
    private readonly IMapper _mapper;

    public GetExpiringSdsQueryHandler(IHazardousMaterialRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<HazardousMaterialListItemDto>> Handle(GetExpiringSdsQuery request, CancellationToken ct)
    {
        var materials = await _repository
            .ListExpiringSdsAsync(request.WithinDays, request.TenantId, ct)
            .ConfigureAwait(false);

        return _mapper.Map<List<HazardousMaterialListItemDto>>(materials);
    }
}
