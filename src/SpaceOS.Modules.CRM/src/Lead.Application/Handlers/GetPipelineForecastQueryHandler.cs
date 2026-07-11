using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get pipeline forecast (opportunities by status with totals and probabilities).
/// Used for sales forecasting dashboards.
/// </summary>
public sealed class GetPipelineForecastQueryHandler : IRequestHandler<GetPipelineForecastQuery, Result<PipelineForecastDto>>
{
    private readonly IOpportunityRepository _repository;

    public GetPipelineForecastQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PipelineForecastDto>> Handle(GetPipelineForecastQuery request, CancellationToken ct)
    {
        try
        {
            var opportunities = await _repository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

            // Group by status and calculate metrics
            var stages = opportunities
                .GroupBy(o => o.Status.ToString())
                .Select(g => new PipelineStageDto
                {
                    Status = g.Key,
                    Count = g.Count(),
                    TotalValue = g.Sum(o => o.EstimatedValue.Amount),
                    AverageProbability = g.Average(o => o.Probability),
                    WeightedValue = g.Sum(o => o.EstimatedValue.Amount * (o.Probability / 100m))
                })
                .OrderBy(s => GetStageOrder(s.Status))
                .ToList();

            // Calculate weighted total value
            decimal weightedTotal = opportunities.Sum(o => o.EstimatedValue.Amount * (o.Probability / 100m));

            // Determine currency (assume all opportunities use same currency)
            string currency = opportunities.FirstOrDefault()?.EstimatedValue.Currency ?? "HUF";

            var forecast = new PipelineForecastDto
            {
                TenantId = request.TenantId,
                AsOf = request.AsOf ?? DateTime.UtcNow.Date,
                Stages = stages,
                WeightedTotalValue = weightedTotal,
                Currency = currency
            };

            return Result.Success(forecast);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to calculate pipeline forecast: {ex.Message}");
        }
    }

    /// <summary>
    /// Determine stage order for pipeline visualization.
    /// </summary>
    private static int GetStageOrder(string status) => status switch
    {
        "Open" => 1,
        "NeedsAssessment" => 2,
        "SolutionAssembly" => 3,
        "Proposal" => 4,
        "Negotiation" => 5,
        "Won" => 6,
        "Lost" => 7,
        "Abandoned" => 8,
        _ => 9
    };
}
