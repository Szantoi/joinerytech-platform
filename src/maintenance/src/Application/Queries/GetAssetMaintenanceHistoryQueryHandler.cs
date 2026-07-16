using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetAssetMaintenanceHistoryQuery.
/// </summary>
public class GetAssetMaintenanceHistoryQueryHandler : IRequestHandler<GetAssetMaintenanceHistoryQuery, Result<WorkOrderDto[]>>
{
    private readonly IAssetRepository _assetRepository;
    private readonly IWorkOrderRepository _workOrderRepository;

    public GetAssetMaintenanceHistoryQueryHandler(
        IAssetRepository assetRepository,
        IWorkOrderRepository workOrderRepository)
    {
        _assetRepository = assetRepository;
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result<WorkOrderDto[]>> Handle(GetAssetMaintenanceHistoryQuery request, CancellationToken ct)
    {
        try
        {
            // Verify asset exists
            var asset = await _assetRepository
                .GetByIdAsync(request.AssetId, ct)
                .ConfigureAwait(false);

            if (asset == null)
            {
                return Result<WorkOrderDto[]>.NotFound($"Asset with ID '{request.AssetId}' not found");
            }

            // Get active work orders for this asset
            var workOrders = await _workOrderRepository
                .GetActiveByAssetAsync(request.AssetId, ct)
                .ConfigureAwait(false);

            // Map to DTOs (shared mapper — single mapping source)
            var dtos = workOrders
                .Select(wo => WorkOrderDtoMapper.ToDto(wo, asset.Code, asset.Name))
                .ToArray();

            return Result<WorkOrderDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<WorkOrderDto[]>.Error($"Failed to retrieve asset maintenance history: {ex.Message}");
        }
    }
}
