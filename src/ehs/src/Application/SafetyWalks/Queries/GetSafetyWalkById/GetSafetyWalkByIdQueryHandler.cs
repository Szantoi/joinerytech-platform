using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.GetSafetyWalkById;

public class GetSafetyWalkByIdQueryHandler : IRequestHandler<GetSafetyWalkByIdQuery, SafetyWalkDto>
{
    private readonly ISafetyWalkRepository _repository;
    private readonly IMapper _mapper;

    public GetSafetyWalkByIdQueryHandler(ISafetyWalkRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<SafetyWalkDto> Handle(GetSafetyWalkByIdQuery request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        return _mapper.Map<SafetyWalkDto>(walk);
    }
}
