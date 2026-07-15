using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.ListSafetyWalks;

public class ListSafetyWalksQueryHandler : IRequestHandler<ListSafetyWalksQuery, List<SafetyWalkListItemDto>>
{
    private readonly ISafetyWalkRepository _repository;
    private readonly IMapper _mapper;

    public ListSafetyWalksQueryHandler(ISafetyWalkRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<SafetyWalkListItemDto>> Handle(ListSafetyWalksQuery request, CancellationToken ct)
    {
        var walks = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<SafetyWalkListItemDto>>(walks);
    }
}
