using Ardalis.Result;
using MediatR;
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

            return Result.Success(MapToDto(opportunity));
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve opportunity: {ex.Message}");
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
