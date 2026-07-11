using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunityForecast;

/// <summary>
/// Handler for GetOpportunityForecastQuery - calculates weighted forecast based on probability
/// </summary>
public class GetOpportunityForecastQueryHandler : IRequestHandler<GetOpportunityForecastQuery, Result<OpportunityForecastResponse>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunityForecastQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<OpportunityForecastResponse>> Handle(GetOpportunityForecastQuery request, CancellationToken ct)
    {
        // Get all active opportunities (not Won, Lost, or Abandoned)
        var opportunities = await _repository.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);

        // Filter for active opportunities in the requested currency
        var activeOpps = opportunities
            .Where(o => o.Status != Domain.Enums.OpportunityStatus.Won
                     && o.Status != Domain.Enums.OpportunityStatus.Lost
                     && o.Status != Domain.Enums.OpportunityStatus.Abandoned
                     && o.EstimatedValue.Currency.ToString() == request.Currency)
            .ToList();

        var forecastItems = activeOpps.Select(opp =>
        {
            var weightedValue = opp.EstimatedValue.Amount * (opp.Probability / 100m);
            return new OpportunityForecastItem
            {
                Id = opp.Id,
                Name = opp.ContactInfo.Name,
                Status = opp.Status.ToString(),
                EstimatedValue = opp.EstimatedValue.Amount,
                Probability = opp.Probability,
                WeightedValue = weightedValue,
                ExpectedCloseDate = opp.ExpectedCloseDate
            };
        }).ToList();

        var response = new OpportunityForecastResponse
        {
            TotalEstimatedValue = forecastItems.Sum(x => x.EstimatedValue),
            WeightedForecast = forecastItems.Sum(x => x.WeightedValue),
            Currency = request.Currency,
            OpportunityCount = forecastItems.Count,
            Items = forecastItems
        };

        return Result<OpportunityForecastResponse>.Success(response);
    }
}
