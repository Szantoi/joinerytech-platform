using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Handler: Get overhead configuration for a tenant
/// </summary>
public class GetOverheadConfigQueryHandler : IRequestHandler<GetOverheadConfigQuery, Result<OverheadConfigDto>>
{
    private readonly IOverheadConfigRepository _repository;
    private readonly IMemoryCache _cache;

    public GetOverheadConfigQueryHandler(
        IOverheadConfigRepository repository,
        IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Result<OverheadConfigDto>> Handle(
        GetOverheadConfigQuery request,
        CancellationToken ct)
    {
        var cacheKey = $"overhead-config-{request.TenantId}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);

            var config = await _repository
                .GetByTenantAsync(request.TenantId, ct)
                .ConfigureAwait(false);

            if (config is null)
            {
                return Result<OverheadConfigDto>.NotFound("Overhead configuration not found");
            }

            var dto = new OverheadConfigDto(
                OverheadConfigId: config.OverheadConfigId,
                TenantId: config.TenantId,
                AllocationMethod: config.AllocationMethod,
                OverheadRate: config.OverheadRate,
                OverheadRules: config.OverheadRules.Select(r => new OverheadRuleDto(
                    CostCategory: r.CostCategory,
                    Exclude: r.Exclude,
                    CustomRate: r.CustomRate
                )).ToList(),
                UpdatedAt: config.UpdatedAt,
                UpdatedBy: config.UpdatedBy
            );

            return Result<OverheadConfigDto>.Success(dto);
        }).ConfigureAwait(false) ?? Result<OverheadConfigDto>.NotFound("Overhead configuration not found");
    }
}
