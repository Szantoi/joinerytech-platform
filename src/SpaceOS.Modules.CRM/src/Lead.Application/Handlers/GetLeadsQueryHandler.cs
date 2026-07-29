using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get paginated list of leads.
/// RLS: Filtered by tenant_id.
/// </summary>
public sealed class GetLeadsQueryHandler : IRequestHandler<GetLeadsQuery, Result<PaginatedResponse<LeadDto>>>
{
    private readonly ILeadRepository _repository;

    public GetLeadsQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PaginatedResponse<LeadDto>>> Handle(GetLeadsQuery request, CancellationToken ct)
    {
        try
        {
            var status = ParseStatus(request.StatusFilter);
            if (!string.IsNullOrEmpty(request.StatusFilter) && !status.HasValue)
            {
                return Result.Success(new PaginatedResponse<LeadDto>
                {
                    Data = [], Total = 0, Page = request.Page, PageSize = request.PageSize
                });
            }

            // The repository applies all predicates and Skip/Take in SQL; this
            // prevents a tenant-wide aggregate load for a 50-row portal list.
            var page = await _repository.GetPageAsync(
                request.TenantId, status, request.AssignedToUserIdFilter,
                request.SearchText, request.Page, request.PageSize, ct).ConfigureAwait(false);

            var paginatedLeads = page.Items
                .Take(request.PageSize)
                .Select(CrmDtoMapper.ToDto)
                .ToList();

            var response = new PaginatedResponse<LeadDto>
            {
                Data = paginatedLeads,
                Total = page.Total,
                Page = request.Page,
                PageSize = request.PageSize
            };

            return Result.Success(response);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve leads: {ex.Message}");
        }
    }

    private static Domain.Enums.LeadStatus? ParseStatus(string? statusFilter)
        => Enum.TryParse<Domain.Enums.LeadStatus>(statusFilter, out var status) ? status : null;

}
