using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;

/// <summary>
/// Handler for SetOverheadConfigCommand - creates or updates overhead configuration
/// </summary>
public sealed class SetOverheadConfigCommandHandler : IRequestHandler<SetOverheadConfigCommand, Result>
{
    private readonly IOverheadConfigRepository _repository;
    private readonly IMemoryCache _cache;

    public SetOverheadConfigCommandHandler(
        IOverheadConfigRepository repository,
        IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Result> Handle(
        SetOverheadConfigCommand request,
        CancellationToken ct)
    {
        // Check if config already exists
        var existing = await _repository
            .GetByTenantAsync(request.TenantId, ct)
            .ConfigureAwait(false);

        OverheadConfig config;
        if (existing is null)
        {
            // Create new configuration
            config = OverheadConfig.Create(
                tenantId: request.TenantId,
                allocationMethod: request.Method,
                overheadRate: request.Rate,
                createdBy: request.UpdatedBy
            );
        }
        else
        {
            // Update existing configuration
            config = existing;
            config.UpdateRate(request.Rate, request.UpdatedBy);
            config.UpdateAllocationMethod(request.Method, request.UpdatedBy);
        }

        await _repository.SaveAsync(config, ct).ConfigureAwait(false);

        // Invalidate all cost calculation caches for this tenant
        _cache.Remove($"overhead-config-{request.TenantId}");
        _cache.Remove($"portfolio-{request.TenantId}");

        return Result.Success();
    }
}
