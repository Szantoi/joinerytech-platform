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
                .ToDictionary(a => a!.Id.Value, a => a.Code);

            // Map to DTOs
            var dtos = pendingWorkOrders.Select(wo => new WorkOrderDto(
                Id: wo.Id.Value,
                AssetId: wo.AssetId.Value,
                AssetCode: assetDict.TryGetValue(wo.AssetId.Value, out var code) ? code : "UNKNOWN",
                Type: wo.Type,
                Priority: wo.Priority,
                Status: wo.Status,
                Title: wo.Title,
                Description: wo.Description,
                ScheduledStart: wo.ScheduledAt,
                EstimatedHours: wo.EstimatedHours,
                ActualHours: wo.ActualHours,
                AssignedTo: wo.AssignedEmployeeId ?? wo.AssignedPartnerId,
                AssignmentType: wo.AssignmentType,
                RequiresDowntime: wo.RequiresDowntime,
                Parts: wo.Parts.Select(p => new WorkOrderPartDto(
                    CatalogCode: p.CatalogCode,
                    Quantity: p.Quantity,
                    UnitPrice: p.UnitPrice.Amount,
                    TotalPrice: p.TotalPrice.Amount
                )).ToArray(),
                TotalPartsCost: wo.Parts.Sum(p => p.TotalPrice.Amount),
                CompletionNote: null,
                CreatedAt: wo.ReportedAt
            )).ToArray();

            return Result<WorkOrderDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<WorkOrderDto[]>.Error($"Failed to retrieve pending work orders: {ex.Message}");
        }
    }
}
