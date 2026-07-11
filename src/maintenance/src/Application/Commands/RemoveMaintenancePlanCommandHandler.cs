using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for RemoveMaintenancePlanCommand.
/// </summary>
public class RemoveMaintenancePlanCommandHandler : IRequestHandler<RemoveMaintenancePlanCommand, Result>
{
    private readonly IAssetRepository _assetRepository;

    public RemoveMaintenancePlanCommandHandler(IAssetRepository assetRepository)
    {
        _assetRepository = assetRepository;
    }

    public async Task<Result> Handle(RemoveMaintenancePlanCommand request, CancellationToken ct)
    {
        try
        {
            var asset = await _assetRepository
                .GetByIdAsync(request.AssetId, ct)
                .ConfigureAwait(false);

            if (asset == null)
            {
                return Result.NotFound($"Asset with ID '{request.AssetId}' not found");
            }

            if (request.PlanIndex < 0 || request.PlanIndex >= asset.MaintenancePlans.Count)
            {
                return Result.Error($"Invalid plan index: {request.PlanIndex}. Asset has {asset.MaintenancePlans.Count} maintenance plans.");
            }

            // Get the plan at the specified index
            var planToRemove = asset.MaintenancePlans[request.PlanIndex];

            // Remove maintenance plan from asset (by ID)
            asset.RemoveMaintenancePlan(planToRemove.Id);

            await _assetRepository.UpdateAsync(asset, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors
            return Result.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors
            return Result.Error($"Failed to remove maintenance plan: {ex.Message}");
        }
    }
}
