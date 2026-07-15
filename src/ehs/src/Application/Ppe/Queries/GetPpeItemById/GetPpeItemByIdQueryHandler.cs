using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.GetPpeItemById;

public class GetPpeItemByIdQueryHandler : IRequestHandler<GetPpeItemByIdQuery, PpeItemDto>
{
    private readonly IPpeItemRepository _repository;
    private readonly IMapper _mapper;

    public GetPpeItemByIdQueryHandler(IPpeItemRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<PpeItemDto> Handle(GetPpeItemByIdQuery request, CancellationToken ct)
    {
        var item = await _repository.GetByIdAsync(request.PpeItemId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE item {request.PpeItemId} not found");

        return _mapper.Map<PpeItemDto>(item);
    }
}
