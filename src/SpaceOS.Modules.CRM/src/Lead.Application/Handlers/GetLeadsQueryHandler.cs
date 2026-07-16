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
            // Fetch leads for tenant (RLS enforced by repository)
            var leads = await _repository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

            // Apply status filter if provided
            if (!string.IsNullOrEmpty(request.StatusFilter))
            {
                leads = leads.Where(l => l.Status.ToString() == request.StatusFilter).ToList();
            }

            // Apply assigned user filter if provided
            if (request.AssignedToUserIdFilter.HasValue)
            {
                leads = leads.Where(l => l.AssignedTo == request.AssignedToUserIdFilter).ToList();
            }

            // Free-text search over contact name / company / e-mail (portal: q)
            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                leads = leads.Where(l => Matches(l, request.SearchText)).ToList();
            }

            // Count total before pagination
            int total = leads.Count;

            // Apply pagination
            var paginatedLeads = leads
                .OrderByDescending(l => l.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(CrmDtoMapper.ToDto)
                .ToList();

            var response = new PaginatedResponse<LeadDto>
            {
                Data = paginatedLeads,
                Total = total,
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

    /// <summary>
    /// Case-insensitive free-text match over the fields the portal's lead search
    /// covers (contact name, company, e-mail). Pure — unit-testable in isolation.
    /// </summary>
    internal static bool Matches(Domain.Aggregates.Lead lead, string searchText)
    {
        var haystack = $"{lead.ContactInfo.Name} {lead.ContactInfo.Company} {lead.ContactInfo.Email}";

        return haystack.Contains(searchText, StringComparison.OrdinalIgnoreCase);
    }

}
