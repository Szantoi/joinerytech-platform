using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Handler: Get EAC calculation with category breakdown and overhead
/// </summary>
public class GetEACCalculationQueryHandler : IRequestHandler<GetEACCalculationQuery, Result<EACCalculationDto>>
{
    private readonly IProjectCostCalculationService _calculationService;
    private readonly IMemoryCache _cache;

    public GetEACCalculationQueryHandler(
        IProjectCostCalculationService calculationService,
        IMemoryCache cache)
    {
        _calculationService = calculationService;
        _cache = cache;
    }

    public async Task<Result<EACCalculationDto>> Handle(
        GetEACCalculationQuery request,
        CancellationToken ct)
    {
        var cacheKey = $"eac-{request.ProjectId}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);

            var calculation = await _calculationService
                .CalculateAsync(request.ProjectId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Map domain aggregate to DTO
            var costByCategory = new Dictionary<CostCategory, CategoryCostDto>();
            foreach (var kvp in calculation.CostByCategory)
            {
                costByCategory[kvp.Key] = new CategoryCostDto(
                    Planned: new MoneyDto(kvp.Value.Planned.Amount, kvp.Value.Planned.Currency),
                    Actual: new MoneyDto(kvp.Value.Actual.Amount, kvp.Value.Actual.Currency),
                    Projected: new MoneyDto(kvp.Value.Projected.Amount, kvp.Value.Projected.Currency),
                    Variance: new MoneyDto(kvp.Value.Variance.Amount, kvp.Value.Variance.Currency)
                );
            }

            var dto = new EACCalculationDto(
                ProjectId: request.ProjectId,
                CostByCategory: costByCategory,
                TotalEac: new MoneyDto(calculation.CostEAC.Amount, calculation.CostEAC.Currency),
                Overhead: new MoneyDto(calculation.Overhead.Amount, calculation.Overhead.Currency),
                OverheadMethod: calculation.OverheadMethod,
                CalculatedAt: calculation.CalculatedAt
            );

            return Result<EACCalculationDto>.Success(dto);
        }).ConfigureAwait(false) ?? Result<EACCalculationDto>.NotFound("EAC calculation not found");
    }
}
