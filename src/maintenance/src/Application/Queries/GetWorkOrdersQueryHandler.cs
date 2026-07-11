using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetWorkOrdersQuery.
/// </summary>
public class GetWorkOrdersQueryHandler : IRequestHandler<GetWorkOrdersQuery, Result<WorkOrderListDto[]>>
{
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetRepository _assetRepository;

    public GetWorkOrdersQueryHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository)
    {
        _workOrderRepository = workOrderRepository;
        _assetRepository = assetRepository;
    }

    public async Task<Result<WorkOrderListDto[]>> Handle(GetWorkOrdersQuery request, CancellationToken ct)
    {
        try
        {
            // Get work orders (by status if filtered, otherwise enumerate all statuses)
            List<Domain.Aggregates.WorkOrder> workOrderList;
            if (request.Status.HasValue)
            {
                var workOrders = await _workOrderRepository
                    .GetByStatusAsync(TenantId.From(request.TenantId), request.Status.Value, ct)
                    .ConfigureAwait(false);
                workOrderList = workOrders.ToList();
            }
            else
            {
                // Enumerate all WorkOrderStatus values
                var allStatuses = Enum.GetValues<Domain.Enums.WorkOrderStatus>();
                var tasks = allStatuses.Select(status =>
                    _workOrderRepository.GetByStatusAsync(TenantId.From(request.TenantId), status, ct));
                var results = await Task.WhenAll(tasks).ConfigureAwait(false);
                workOrderList = results.SelectMany(x => x).ToList();
            }

            // Apply Type filter if specified
            if (request.Type.HasValue)
            {
                workOrderList = workOrderList.Where(wo => wo.Type == request.Type.Value).ToList();
            }

            // Get assets for denormalized AssetCode (fetch individually by ID)
            var assetTasks = workOrderList.Select(wo =>
                _assetRepository.GetByIdAsync(wo.AssetId, ct));
            var assetResults = await Task.WhenAll(assetTasks).ConfigureAwait(false);

            var assetDict = assetResults
                .Where(a => a != null)
                .ToDictionary(a => a!.Id.Value, a => a.Code);

            // Map to DTOs
            var dtos = workOrderList.Select(wo => new WorkOrderListDto(
                Id: wo.Id.Value,
                AssetId: wo.AssetId.Value,
                AssetCode: assetDict.TryGetValue(wo.AssetId.Value, out var code) ? code : "UNKNOWN",
                Type: wo.Type,
                Priority: wo.Priority,
                Status: wo.Status,
                Title: wo.Title,
                CreatedAt: wo.ReportedAt
            )).ToArray();

            // Apply pagination
            var paginatedDtos = dtos
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToArray();

            return Result<WorkOrderListDto[]>.Success(paginatedDtos);
        }
        catch (Exception ex)
        {
            return Result<WorkOrderListDto[]>.Error($"Failed to retrieve work orders: {ex.Message}");
        }
    }
}
