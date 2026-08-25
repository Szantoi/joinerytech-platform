using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.ListSafetyWalks;

public class ListSafetyWalksQueryHandler : IRequestHandler<ListSafetyWalksQuery, List<SafetyWalkListItemDto>>
{
    private readonly ISafetyWalkRepository _repository;

    public ListSafetyWalksQueryHandler(ISafetyWalkRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<SafetyWalkListItemDto>> Handle(ListSafetyWalksQuery request, CancellationToken ct)
    {
        var walks = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return walks.Select(walk => walk.ToListItemDto()).ToList();
    }
}
