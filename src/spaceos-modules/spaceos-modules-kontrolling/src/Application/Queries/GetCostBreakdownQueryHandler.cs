using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Handler: Get detailed cost breakdown with costs and margins
/// </summary>
public class GetCostBreakdownQueryHandler : IRequestHandler<GetCostBreakdownQuery, Result<CostSummaryDto>>
{
    private readonly IProjectCostCalculationService _calculationService;
    private readonly IMemoryCache _cache;

    public GetCostBreakdownQueryHandler(
        IProjectCostCalculationService calculationService,
        IMemoryCache cache)
    {
        _calculationService = calculationService;
        _cache = cache;
    }

    public async Task<Result<CostSummaryDto>> Handle(
        GetCostBreakdownQuery request,
        CancellationToken ct)
    {
        var cacheKey = $"cost-breakdown-{request.ProjectId}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);

            var calculation = await _calculationService
                .CalculateAsync(request.ProjectId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Calculate margins using domain logic
            var plannedMargin = Margin.Calculate(calculation.Revenue.Planned, calculation.TotalPlannedCost);
            var actualMargin = Margin.Calculate(calculation.Revenue.Actual, calculation.TotalActualCost);

            var dto = new CostSummaryDto(
                ProjectId: request.ProjectId,
                Revenue: new MoneyDto(calculation.Revenue.Planned.Amount, calculation.Revenue.Planned.Currency),
                Costs: new CostsDto(
                    Planned: new MoneyDto(calculation.TotalPlannedCost.Amount, calculation.TotalPlannedCost.Currency),
                    Actual: new MoneyDto(calculation.TotalActualCost.Amount, calculation.TotalActualCost.Currency),
                    Eac: new MoneyDto(calculation.CostEAC.Amount, calculation.CostEAC.Currency),
                    Variance: new MoneyDto(calculation.TotalVariance.Amount, calculation.TotalVariance.Currency),
                    VariancePercentage: calculation.VariancePercentage
                ),
                Margins: new MarginsDto(
                    PlannedMargin: new MarginDto(
                        new MoneyDto(plannedMargin.Amount.Amount, plannedMargin.Amount.Currency),
                        plannedMargin.Percentage
                    ),
                    ActualMargin: new MarginDto(
                        new MoneyDto(actualMargin.Amount.Amount, actualMargin.Amount.Currency),
                        actualMargin.Percentage
                    ),
                    EacMargin: new MarginDto(
                        new MoneyDto(calculation.EACMargin.Amount.Amount, calculation.EACMargin.Amount.Currency),
                        calculation.EACMargin.Percentage
                    )
                ),
                CalculatedAt: calculation.CalculatedAt
            );

            return Result<CostSummaryDto>.Success(dto);
        }).ConfigureAwait(false) ?? Result<CostSummaryDto>.NotFound("Cost breakdown not found");
    }
}
