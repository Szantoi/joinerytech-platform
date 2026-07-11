using Ardalis.Result;
using MediatR;
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
            var opportunities = await _repository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

            // Apply status filter if provided
            if (!string.IsNullOrEmpty(request.StatusFilter))
            {
                opportunities = opportunities.Where(o => o.Status.ToString() == request.StatusFilter).ToList();
            }

            // Apply assigned user filter if provided
            if (request.AssignedToUserIdFilter.HasValue)
            {
                opportunities = opportunities.Where(o => o.AssignedToUserId == request.AssignedToUserIdFilter).ToList();
            }

            // Count total before pagination
            int total = opportunities.Count;

            // Apply pagination
            var paginatedOpportunities = opportunities
                .OrderByDescending(o => o.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(MapToDto)
                .ToList();

            var response = new PaginatedResponse<OpportunityDto>
            {
                Data = paginatedOpportunities,
                Total = total,
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

    private static OpportunityDto MapToDto(Domain.Aggregates.Opportunity opportunity)
    {
        return new OpportunityDto
        {
            Id = opportunity.Id,
            TenantId = opportunity.TenantId,
            Status = opportunity.Status.ToString(),
            LeadId = opportunity.LeadId,
            CustomerId = opportunity.CustomerId,
            CustomerName = opportunity.CustomerName,
            ContactName = opportunity.ContactInfo.Name,
            Email = opportunity.ContactInfo.Email,
            Phone = opportunity.ContactInfo.Phone,
            Company = opportunity.ContactInfo.Company,
            Title = opportunity.Title,
            EstimatedValue = opportunity.EstimatedValue.Amount,
            Currency = opportunity.EstimatedValue.Currency,
            FinalValue = opportunity.FinalValue?.Amount,
            Probability = opportunity.Probability,
            ExpectedCloseDate = opportunity.ExpectedCloseDate,
            AssignedToUserId = opportunity.AssignedToUserId,
            AssignedToUserName = opportunity.AssignedToUserName ?? string.Empty,
            OrderRef = opportunity.OrderRef,
            QuoteRef = opportunity.QuoteRef,
            LossReason = opportunity.LossReason,
            CompetitorName = opportunity.CompetitorName,
            ActivityCount = opportunity.Activities.Count,
            TaskCount = opportunity.Tasks.Count,
            OpenTaskCount = opportunity.Tasks.Count(t => !t.IsCompleted),
            CreatedAt = opportunity.CreatedAt,
            CreatedByName = opportunity.CreatedByName ?? string.Empty,
            UpdatedAt = opportunity.UpdatedAt,
            UpdatedByName = opportunity.UpdatedByName
        };
    }
}
