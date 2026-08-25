using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.GetSafetyWalkById;

public class GetSafetyWalkByIdQueryHandler : IRequestHandler<GetSafetyWalkByIdQuery, SafetyWalkDto>
{
    private readonly ISafetyWalkRepository _repository;

    public GetSafetyWalkByIdQueryHandler(ISafetyWalkRepository repository)
    {
        _repository = repository;
    }

    public async Task<SafetyWalkDto> Handle(GetSafetyWalkByIdQuery request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        return walk.ToDto();
    }
}
