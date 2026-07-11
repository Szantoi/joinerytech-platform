using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.Services;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetAssetQuery.
/// </summary>
public class GetAssetQueryHandler : IRequestHandler<GetAssetQuery, Result<AssetDto>>
{
    private readonly IAssetRepository _assetRepository;
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetStatusCalculationService _assetStatusService;

    public GetAssetQueryHandler(
        IAssetRepository assetRepository,
        IWorkOrderRepository workOrderRepository,
        IAssetStatusCalculationService assetStatusService)
    {
        _assetRepository = assetRepository;
        _workOrderRepository = workOrderRepository;
        _assetStatusService = assetStatusService;
    }

    public async Task<Result<AssetDto>> Handle(GetAssetQuery request, CancellationToken ct)
    {
        try
        {
            var asset = await _assetRepository
                .GetByIdAsync(request.AssetId, ct)
                .ConfigureAwait(false);

            if (asset == null)
            {
                return Result<AssetDto>.NotFound($"Asset with ID '{request.AssetId}' not found");
            }

            // Get active work orders for status calculation
            var activeWorkOrders = await _workOrderRepository
                .GetActiveByAssetAsync(request.AssetId, ct)
                .ConfigureAwait(false);

            // Compute asset status (NEVER stored in database!)
            var computedStatus = _assetStatusService.GetAssetStatus(asset, activeWorkOrders.ToList());

            // Map to DTO
            var dto = new AssetDto(
                Id: asset.Id.Value,
                Kind: asset.Kind,
                Code: asset.Code,
                Name: asset.Name,
                Location: asset.Location,
                Status: computedStatus,
                OperatingHours: asset.OperatingHours > 0 ? asset.OperatingHours : null,
                Retired: asset.Retired,
                MaintenancePlans: asset.MaintenancePlans.Select(p => new MaintenancePlanDto(
                    Trigger: p.Trigger,
                    IntervalDays: p.IntervalDays,
                    OperatingHoursThreshold: p.IntervalHours,
                    Description: p.Label
                )).ToArray(),
                CreatedAt: DateTime.UtcNow // NOTE: Domain doesn't track CreatedAt
            );

            return Result<AssetDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<AssetDto>.Error($"Failed to retrieve asset: {ex.Message}");
        }
    }
}
