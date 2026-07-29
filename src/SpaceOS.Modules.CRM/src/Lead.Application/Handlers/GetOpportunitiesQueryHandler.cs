using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get paginated list of opportunities.
/// RLS: Filtered by tenant_id.
/// </summary>
public sealed class GetOpportunitiesQueryHandler : IRequestHandler<GetOpportunitiesQuery, Result<PaginatedResponse<OpportunityDto>>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunitiesQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PaginatedResponse<OpportunityDto>>> Handle(GetOpportunitiesQuery request, CancellationToken ct)
    {
        try
        {
            var status = ParseStatus(request.StatusFilter);
            if (!string.IsNullOrEmpty(request.StatusFilter) && !status.HasValue)
            {
                return Result.Success(new PaginatedResponse<OpportunityDto>
                {
                    Data = [], Total = 0, Page = request.Page, PageSize = request.PageSize
                });
            }

            // The repository applies all predicates and Skip/Take in SQL; this
            // prevents a tenant-wide aggregate load for a 50-row portal list.
            var page = await _repository.GetPageAsync(
                request.TenantId, status, request.AssignedToUserIdFilter,
                request.Page, request.PageSize, ct).ConfigureAwait(false);

            var paginatedOpportunities = page.Items
                .Take(request.PageSize)
                .Select(CrmDtoMapper.ToDto)
                .ToList();

            var response = new PaginatedResponse<OpportunityDto>
            {
                Data = paginatedOpportunities,
                Total = page.Total,
                Page = request.Page,
                PageSize = request.PageSize
            };

            return Result.Success(response);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve opportunities: {ex.Message}");
        }
    }

    private static Domain.Enums.OpportunityStatus? ParseStatus(string? statusFilter)
        => Enum.TryParse<Domain.Enums.OpportunityStatus>(statusFilter, out var status) ? status : null;

}
