using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.FSM;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: pipeline forecast — opportunities grouped by stage with totals and
/// weighted values (portal Forecast screen).
///
/// The weighting probability is CONFIG-DRIVEN (<c>Crm:Forecast:StageProbability</c>,
/// defaulting to the domain policy table that mirrors the portal
/// OPP_STAGE_PROBABILITY), rather than averaging the per-deal probability — so the
/// forecast stays a stage-level figure the UI can reproduce (QUALITY.md 3.).
/// </summary>
public sealed class GetPipelineForecastQueryHandler
    : IRequestHandler<GetPipelineForecastQuery, Result<PipelineForecastDto>>
{
    private const string DefaultCurrency = "HUF";

    private readonly IOpportunityRepository _repository;
    private readonly CrmOptions _options;
    private readonly TimeProvider _timeProvider;

    public GetPipelineForecastQueryHandler(
        IOpportunityRepository repository,
        IOptions<CrmOptions> options,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public async Task<Result<PipelineForecastDto>> Handle(GetPipelineForecastQuery request, CancellationToken ct)
    {
        var opportunities = await _repository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

        var stages = opportunities
            .GroupBy(o => o.Status)
            .Select(group =>
            {
                var probability = _options.Forecast.ProbabilityFor(group.Key);
                var totalValue = group.Sum(o => o.EstimatedValue.Amount);

                return new PipelineStageDto
                {
                    Status = group.Key.ToString(),
                    Count = group.Count(),
                    TotalValue = totalValue,
                    AverageProbability = probability,
                    WeightedValue = decimal.Round(totalValue * (probability / 100m), 2)
                };
            })
            .OrderBy(s => GetStageOrder(s.Status))
            .ToList();

        var forecast = new PipelineForecastDto
        {
            TenantId = request.TenantId,
            AsOf = request.AsOf ?? _timeProvider.GetUtcNow(),
            Stages = stages,
            WeightedTotalValue = stages.Sum(s => s.WeightedValue),
            // A tenant's pipeline is expected in a single currency; the first
            // opportunity is representative (multi-currency = follow-up).
            Currency = opportunities.FirstOrDefault()?.EstimatedValue.Currency ?? DefaultCurrency
        };

        return Result.Success(forecast);
    }

    /// <summary>
    /// Stage order for the pipeline visualisation: the open main chain in order,
    /// then the terminal states (single source: OpportunityStatusTransitions).
    /// </summary>
    private static int GetStageOrder(string status)
    {
        if (!Enum.TryParse<OpportunityStatus>(status, out var parsed))
        {
            return int.MaxValue;
        }

        var mainChainIndex = OpportunityStatusTransitions.OpenStages.ToList().IndexOf(parsed);

        return mainChainIndex >= 0
            ? mainChainIndex
            : OpportunityStatusTransitions.OpenStages.Count + (int)parsed;
    }
}
