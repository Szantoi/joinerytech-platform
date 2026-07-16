using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetPendingWorkOrdersQuery.
/// </summary>
public class GetPendingWorkOrdersQueryHandler : IRequestHandler<GetPendingWorkOrdersQuery, Result<WorkOrderDto[]>>
{
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetRepository _assetRepository;

    public GetPendingWorkOrdersQueryHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository)
    {
        _workOrderRepository = workOrderRepository;
        _assetRepository = assetRepository;
    }

    public async Task<Result<WorkOrderDto[]>> Handle(GetPendingWorkOrdersQuery request, CancellationToken ct)
    {
        try
        {
            // Get work orders with Reported status (pending)
            var workOrders = await _workOrderRepository
                .GetByStatusAsync(TenantId.From(request.TenantId), WorkOrderStatus.Reported, ct)
                .ConfigureAwait(false);

            var pendingWorkOrders = workOrders.ToList();

            // Get assets for denormalized AssetCode (fetch individually by ID)
            var assetTasks = pendingWorkOrders.Select(wo =>
                _assetRepository.GetByIdAsync(wo.AssetId, ct));
            var assetResults = await Task.WhenAll(assetTasks).ConfigureAwait(false);

            var assetDict = assetResults
                .Where(a => a != null)
                .ToDictionary(a => a!.Id.Value, a => a!);

            // Map to DTOs (shared mapper — single mapping source)
            var dtos = pendingWorkOrders
                .Select(wo => assetDict.TryGetValue(wo.AssetId.Value, out var asset)
                    ? WorkOrderDtoMapper.ToDto(wo, asset.Code, asset.Name)
                    : WorkOrderDtoMapper.ToDto(wo, null))
                .ToArray();

            return Result<WorkOrderDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<WorkOrderDto[]>.Error($"Failed to retrieve pending work orders: {ex.Message}");
        }
    }
}
