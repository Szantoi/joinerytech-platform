using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.Services;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetAssetsRequiringMaintenanceQuery.
/// </summary>
public class GetAssetsRequiringMaintenanceQueryHandler : IRequestHandler<GetAssetsRequiringMaintenanceQuery, Result<AssetDto[]>>
{
    private readonly IAssetRepository _assetRepository;
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IPreventiveMaintenanceSchedulerService _preventiveMaintenanceService;
    private readonly IAssetStatusCalculationService _assetStatusService;

    public GetAssetsRequiringMaintenanceQueryHandler(
        IAssetRepository assetRepository,
        IWorkOrderRepository workOrderRepository,
        IPreventiveMaintenanceSchedulerService preventiveMaintenanceService,
        IAssetStatusCalculationService assetStatusService)
    {
        _assetRepository = assetRepository;
        _workOrderRepository = workOrderRepository;
        _preventiveMaintenanceService = preventiveMaintenanceService;
        _assetStatusService = assetStatusService;
    }

    public async Task<Result<AssetDto[]>> Handle(GetAssetsRequiringMaintenanceQuery request, CancellationToken ct)
    {
        try
        {
            // Get all assets by enumerating all AssetKind values
            var allKinds = Enum.GetValues<Domain.Enums.AssetKind>();
            var assetTasks = allKinds.Select(kind =>
                _assetRepository.GetActiveByKindAsync(TenantId.From(request.TenantId), kind, ct));
            var assetResults = await Task.WhenAll(assetTasks).ConfigureAwait(false);
            var allAssets = assetResults.SelectMany(x => x).ToList();

            // Filter assets requiring maintenance based on their maintenance plans
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var assetsRequiringMaintenance = allAssets.Where(asset =>
                asset.MaintenancePlans.Any(plan =>
                    _preventiveMaintenanceService.IsDue(plan, today, asset.OperatingHours))).ToList();

            // Get work orders for status calculation (per asset)
            var workOrderTasks = assetsRequiringMaintenance.Select(asset =>
                _workOrderRepository.GetActiveByAssetAsync(asset.Id, ct));
            var workOrderResults = await Task.WhenAll(workOrderTasks).ConfigureAwait(false);
            var allWorkOrders = workOrderResults.SelectMany(x => x).ToList();

            // Map to DTOs
            var dtos = assetsRequiringMaintenance.Select(asset =>
            {
                var assetWorkOrders = allWorkOrders.Where(wo => wo.AssetId.Value == asset.Id.Value).ToList();
                var computedStatus = _assetStatusService.GetAssetStatus(asset, assetWorkOrders);

                return new AssetDto(
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
            }).ToArray();

            return Result<AssetDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<AssetDto[]>.Error($"Failed to retrieve assets requiring maintenance: {ex.Message}");
        }
    }
}
