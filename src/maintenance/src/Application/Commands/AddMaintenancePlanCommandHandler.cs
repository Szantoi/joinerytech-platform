using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for AddMaintenancePlanCommand.
/// </summary>
public class AddMaintenancePlanCommandHandler : IRequestHandler<AddMaintenancePlanCommand, Result>
{
    private readonly IAssetRepository _assetRepository;

    public AddMaintenancePlanCommandHandler(IAssetRepository assetRepository)
    {
        _assetRepository = assetRepository;
    }

    public async Task<Result> Handle(AddMaintenancePlanCommand request, CancellationToken ct)
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

            // Create maintenance plan based on trigger type
            MaintenancePlan plan;
            if (request.Trigger == MaintenanceTrigger.Interval)
            {
                if (request.IntervalDays == null || request.IntervalDays <= 0)
                {
                    return Result.Error("IntervalDays is required and must be positive for Interval trigger");
                }

                // Simplified: using default values for estimatedHours and assigneeType
                // In production, these would be part of the command or configurable
                plan = MaintenancePlan.CreateIntervalBased(
                    label: request.Description ?? "Scheduled Maintenance",
                    intervalDays: request.IntervalDays.Value,
                    estimatedHours: 1m, // Default placeholder
                    assigneeType: AssignmentType.Internal);
            }
            else // OperatingHours
            {
                if (request.OperatingHoursThreshold == null || request.OperatingHoursThreshold <= 0)
                {
                    return Result.Error("OperatingHoursThreshold is required and must be positive for OperatingHours trigger");
                }

                plan = MaintenancePlan.CreateHoursBased(
                    label: request.Description ?? "Hours-Based Maintenance",
                    intervalHours: request.OperatingHoursThreshold.Value,
                    estimatedHours: 1m, // Default placeholder
                    assigneeType: AssignmentType.Internal);
            }

            // Add maintenance plan to asset
            asset.AddMaintenancePlan(plan);

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
            return Result.Error($"Failed to add maintenance plan: {ex.Message}");
        }
    }
}
