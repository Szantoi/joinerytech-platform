using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.DeleteCostAdjustment;

/// <summary>
/// Handler for DeleteCostAdjustmentCommand - soft deletes a cost adjustment
/// </summary>
public sealed class DeleteCostAdjustmentCommandHandler : IRequestHandler<DeleteCostAdjustmentCommand, Result>
{
    private readonly ICostAdjustmentRepository _repository;
    private readonly IMemoryCache _cache;

    public DeleteCostAdjustmentCommandHandler(
        ICostAdjustmentRepository repository,
        IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Result> Handle(
        DeleteCostAdjustmentCommand request,
        CancellationToken ct)
    {
        var adjustment = await _repository
            .GetByIdAsync(request.AdjustmentId, request.TenantId, ct)
            .ConfigureAwait(false);

        if (adjustment is null)
        {
            return Result.NotFound("Cost adjustment not found");
        }

        if (adjustment.IsDeleted)
        {
            return Result.Error("Cost adjustment is already deleted");
        }

        adjustment.Delete(request.DeletedBy);

        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

        // Invalidate project cost cache
        if (adjustment.ProjectId.HasValue)
        {
            _cache.Remove($"project-cost-{adjustment.ProjectId.Value}");
            _cache.Remove($"eac-{adjustment.ProjectId.Value}");
            _cache.Remove($"cost-breakdown-{adjustment.ProjectId.Value}");
            _cache.Remove($"variance-{adjustment.ProjectId.Value}");
        }

        // Invalidate tenant portfolio cache
        _cache.Remove($"portfolio-{request.TenantId}");

        return Result.Success();
    }
}
