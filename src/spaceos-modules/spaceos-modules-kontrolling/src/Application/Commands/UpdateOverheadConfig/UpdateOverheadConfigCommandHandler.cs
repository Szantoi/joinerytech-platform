using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.UpdateOverheadConfig;

/// <summary>
/// Handler for UpdateOverheadConfigCommand - updates existing overhead configuration
/// </summary>
public sealed class UpdateOverheadConfigCommandHandler : IRequestHandler<UpdateOverheadConfigCommand, Result>
{
    private readonly IOverheadConfigRepository _repository;
    private readonly IMemoryCache _cache;

    public UpdateOverheadConfigCommandHandler(
        IOverheadConfigRepository repository,
        IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Result> Handle(
        UpdateOverheadConfigCommand request,
        CancellationToken ct)
    {
        // Check if config exists
        var config = await _repository
            .GetByTenantAsync(request.TenantId, ct)
            .ConfigureAwait(false);

        if (config is null)
        {
            return Result.NotFound("Overhead configuration not found for tenant");
        }

        // Update using domain methods
        config.UpdateRate(request.Rate, request.UpdatedBy);
        config.UpdateAllocationMethod(request.Method, request.UpdatedBy);

        await _repository.SaveAsync(config, ct).ConfigureAwait(false);

        // Invalidate all cost calculation caches for this tenant
        _cache.Remove($"overhead-config-{request.TenantId}");
        _cache.Remove($"portfolio-{request.TenantId}");

        return Result.Success();
    }
}
