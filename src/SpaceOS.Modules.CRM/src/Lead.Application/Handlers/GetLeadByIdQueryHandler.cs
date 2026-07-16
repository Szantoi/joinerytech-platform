using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get single lead by ID.
/// RLS: Only if in tenant.
/// </summary>
public sealed class GetLeadByIdQueryHandler : IRequestHandler<GetLeadByIdQuery, Result<LeadDto>>
{
    private readonly ILeadRepository _repository;

    public GetLeadByIdQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<LeadDto>> Handle(GetLeadByIdQuery request, CancellationToken ct)
    {
        try
        {
            var lead = await _repository.GetByIdAsync(request.TenantId, request.LeadId, ct).ConfigureAwait(false);

            if (lead is null)
            {
                return Result.NotFound($"Lead {request.LeadId} not found in tenant {request.TenantId}");
            }

            return Result.Success(CrmDtoMapper.ToDto(lead));
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve lead: {ex.Message}");
        }
    }

}
