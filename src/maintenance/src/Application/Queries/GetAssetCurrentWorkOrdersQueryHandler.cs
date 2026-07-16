using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetAssetCurrentWorkOrdersQuery.
/// </summary>
public class GetAssetCurrentWorkOrdersQueryHandler : IRequestHandler<GetAssetCurrentWorkOrdersQuery, Result<WorkOrderDto[]>>
{
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetRepository _assetRepository;

    public GetAssetCurrentWorkOrdersQueryHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository)
    {
        _workOrderRepository = workOrderRepository;
        _assetRepository = assetRepository;
    }

    public async Task<Result<WorkOrderDto[]>> Handle(GetAssetCurrentWorkOrdersQuery request, CancellationToken ct)
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

            // Get current work orders (Reported, Scheduled, InProgress, Postponed)
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
            return Result<WorkOrderDto[]>.Error($"Failed to retrieve asset current work orders: {ex.Message}");
        }
    }
}
