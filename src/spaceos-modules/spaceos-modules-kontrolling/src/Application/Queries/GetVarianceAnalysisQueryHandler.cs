using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Handler: Get variance analysis with detailed breakdown by category
/// </summary>
public class GetVarianceAnalysisQueryHandler : IRequestHandler<GetVarianceAnalysisQuery, Result<VarianceAnalysisDto>>
{
    private readonly IProjectCostCalculationService _calculationService;
    private readonly IMemoryCache _cache;

    public GetVarianceAnalysisQueryHandler(
        IProjectCostCalculationService calculationService,
        IMemoryCache cache)
    {
        _calculationService = calculationService;
        _cache = cache;
    }

    public async Task<Result<VarianceAnalysisDto>> Handle(
        GetVarianceAnalysisQuery request,
        CancellationToken ct)
    {
        var cacheKey = $"variance-{request.ProjectId}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);

            var calculation = await _calculationService
                .CalculateAsync(request.ProjectId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Build variance details by category
            var variances = new Dictionary<CostCategory, VarianceDetailDto>();
            CostCategory? worstCategory = null;
            decimal maxVariancePercentage = 0;

            foreach (var kvp in calculation.CostByCategory)
            {
                var category = kvp.Key;
                var categoryCost = kvp.Value;

                // Calculate variance percentage for this category
                var variancePercentage = categoryCost.Planned.Amount != 0
                    ? (categoryCost.Variance.Amount / categoryCost.Planned.Amount) * 100
                    : 0;

                variances[category] = new VarianceDetailDto(
                    Planned: new MoneyDto(categoryCost.Planned.Amount, categoryCost.Planned.Currency),
                    Actual: new MoneyDto(categoryCost.Actual.Amount, categoryCost.Actual.Currency),
                    Variance: new MoneyDto(categoryCost.Variance.Amount, categoryCost.Variance.Currency),
                    VariancePercentage: variancePercentage
                );

                // Track worst performing category (highest positive variance)
                if (variancePercentage > maxVariancePercentage)
                {
                    maxVariancePercentage = variancePercentage;
                    worstCategory = category;
                }
            }

            var dto = new VarianceAnalysisDto(
                ProjectId: request.ProjectId,
                Variances: variances,
                TotalVariance: new MoneyDto(calculation.TotalVariance.Amount, calculation.TotalVariance.Currency),
                VariancePercentage: calculation.VariancePercentage,
                WorstPerformingCategory: worstCategory,
                AnalyzedAt: calculation.CalculatedAt
            );

            return Result<VarianceAnalysisDto>.Success(dto);
        }).ConfigureAwait(false) ?? Result<VarianceAnalysisDto>.NotFound("Variance analysis not found");
    }
}
