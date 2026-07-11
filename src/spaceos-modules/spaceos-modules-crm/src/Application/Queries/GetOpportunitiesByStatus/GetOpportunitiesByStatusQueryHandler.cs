using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunitiesByStatus;

/// <summary>
/// Handler for GetOpportunitiesByStatusQuery
/// </summary>
public class GetOpportunitiesByStatusQueryHandler : IRequestHandler<GetOpportunitiesByStatusQuery, Result<IReadOnlyList<OpportunityResponse>>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunitiesByStatusQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<IReadOnlyList<OpportunityResponse>>> Handle(GetOpportunitiesByStatusQuery request, CancellationToken ct)
    {
        var opportunities = await _repository.GetByStatusAsync(request.Status, request.TenantId, ct).ConfigureAwait(false);

        var responses = opportunities.Select(opp => new OpportunityResponse
        {
            Id = opp.Id,
            Name = opp.ContactInfo.Name,
            Email = opp.ContactInfo.Email.Value,
            Phone = opp.ContactInfo.Phone?.Value,
            Company = opp.ContactInfo.Company,
            Status = opp.Status.ToString(),
            EstimatedValue = opp.EstimatedValue.Amount,
            Currency = opp.EstimatedValue.Currency.ToString(),
            Probability = opp.Probability,
            ExpectedCloseDate = opp.ExpectedCloseDate,
            AssignedTo = opp.AssignedTo,
            LeadRef = opp.LeadRef,
            QuoteRef = opp.QuoteRef,
            ActivityCount = opp.Activities.Count,
            TaskCount = opp.Tasks.Count,
            CreatedAt = opp.CreatedAt,
            UpdatedAt = opp.UpdatedAt ?? opp.CreatedAt
        }).ToList();

        return Result<IReadOnlyList<OpportunityResponse>>.Success(responses);
    }
}
