using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get single opportunity by ID.
/// RLS: Only if in tenant.
/// </summary>
public sealed class GetOpportunityByIdQueryHandler : IRequestHandler<GetOpportunityByIdQuery, Result<OpportunityDto>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunityByIdQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<OpportunityDto>> Handle(GetOpportunityByIdQuery request, CancellationToken ct)
    {
        try
        {
            var opportunity = await _repository.GetByIdAsync(request.TenantId, request.OpportunityId, ct).ConfigureAwait(false);

            if (opportunity is null)
            {
                return Result.NotFound($"Opportunity {request.OpportunityId} not found in tenant {request.TenantId}");
            }

            return Result.Success(CrmDtoMapper.ToDto(opportunity));
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve opportunity: {ex.Message}");
        }
    }

}
