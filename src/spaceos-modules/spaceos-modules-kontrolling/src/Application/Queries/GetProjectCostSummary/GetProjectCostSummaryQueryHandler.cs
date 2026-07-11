namespace SpaceOS.Modules.Kontrolling.Application.Queries.GetProjectCostSummary;

using MediatR;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Handler for GetProjectCostSummaryQuery
/// </summary>
public sealed class GetProjectCostSummaryQueryHandler
    : IRequestHandler<GetProjectCostSummaryQuery, CostSummaryDto>
{
    private readonly IProjectCostCalculationService _calculationService;
    private readonly IMemoryCache _cache;

    public GetProjectCostSummaryQueryHandler(
        IProjectCostCalculationService calculationService,
        IMemoryCache cache)
    {
        _calculationService = calculationService;
        _cache = cache;
    }

    public async Task<CostSummaryDto> Handle(
        GetProjectCostSummaryQuery request,
        CancellationToken ct)
    {
        var cacheKey = $"project-cost-{request.ProjectId}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);

            var calculation = await _calculationService.CalculateAsync(
                request.ProjectId,
                request.TenantId,
                ct).ConfigureAwait(false);

            return MapToDto(calculation);
        }) ?? throw new InvalidOperationException("Failed to calculate cost summary");
    }

    private static CostSummaryDto MapToDto(ProjectCostCalculation calculation)
    {
        return new CostSummaryDto(
            ProjectId: calculation.ProjectId,
            Revenue: ToMoneyDto(calculation.Revenue.Actual),
            Costs: new CostsDto(
                Planned: ToMoneyDto(calculation.TotalPlannedCost),
                Actual: ToMoneyDto(calculation.TotalActualCost),
                Eac: ToMoneyDto(calculation.CostEAC),
                Variance: ToMoneyDto(calculation.TotalVariance),
                VariancePercentage: calculation.VariancePercentage
            ),
            Margins: new MarginsDto(
                PlannedMargin: ToMarginDto(Margin.Calculate(calculation.Revenue.Planned, calculation.TotalPlannedCost)),
                ActualMargin: ToMarginDto(Margin.Calculate(calculation.Revenue.Actual, calculation.TotalActualCost)),
                EacMargin: ToMarginDto(calculation.EACMargin)
            ),
            CalculatedAt: calculation.CalculatedAt
        );
    }

    private static MoneyDto ToMoneyDto(Money money) =>
        new MoneyDto(money.Amount, money.Currency);

    private static MarginDto ToMarginDto(Margin margin) =>
        new MarginDto(ToMoneyDto(margin.Amount), margin.Percentage);
}
