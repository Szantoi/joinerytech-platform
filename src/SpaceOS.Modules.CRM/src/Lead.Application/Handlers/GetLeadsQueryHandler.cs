using Ardalis.Result;
using MediatR;
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
                leads = leads.Where(l => l.AssignedToUserId == request.AssignedToUserIdFilter).ToList();
            }

            // Count total before pagination
            int total = leads.Count;

            // Apply pagination
            var paginatedLeads = leads
                .OrderByDescending(l => l.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(MapToDto)
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

    private static LeadDto MapToDto(Domain.Aggregates.Lead lead)
    {
        return new LeadDto
        {
            Id = lead.Id,
            TenantId = lead.TenantId,
            Status = lead.Status.ToString(),
            ContactName = lead.ContactName,
            Email = lead.ContactInfo.Email,
            Phone = lead.ContactInfo.Phone,
            Company = lead.ContactInfo.Company,
            Source = lead.Source.ToString(),
            AssignedToUserId = lead.AssignedToUserId,
            AssignedToUserName = lead.AssignedToUserName ?? string.Empty,
            OpportunityRef = lead.OpportunityRef,
            ActivityCount = lead.Activities.Count,
            TaskCount = lead.Tasks.Count,
            OpenTaskCount = lead.Tasks.Count(t => !t.IsCompleted),
            CreatedAt = lead.CreatedAt,
            CreatedByName = lead.CreatedByName ?? string.Empty,
            UpdatedAt = lead.UpdatedAt,
            UpdatedByName = lead.UpdatedByName
        };
    }
}
