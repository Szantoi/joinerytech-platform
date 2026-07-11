using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get opportunities ready for quote conversion (status = SolutionAssembly).
/// For integration with Sales/Quote module.
/// </summary>
public sealed class GetOpportunitiesForQuoteConversionQueryHandler : IRequestHandler<GetOpportunitiesForQuoteConversionQuery, Result<List<OpportunityDto>>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunitiesForQuoteConversionQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<OpportunityDto>>> Handle(GetOpportunitiesForQuoteConversionQuery request, CancellationToken ct)
    {
        try
        {
            var opportunities = await _repository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

            // Filter to only SolutionAssembly status (ready for quote)
            var quoteReadyOpportunities = opportunities
                .Where(o => o.Status.ToString() == "SolutionAssembly")
                .Select(MapToDto)
                .ToList();

            return Result.Success(quoteReadyOpportunities);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve quote conversion opportunities: {ex.Message}");
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
