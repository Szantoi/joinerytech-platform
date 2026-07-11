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

            // Map to DTOs
            var dtos = workOrders.Select(wo => new WorkOrderDto(
                Id: wo.Id.Value,
                AssetId: wo.AssetId.Value,
                AssetCode: asset.Code,
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
                CompletionNote: wo.ActualHours.HasValue ? "Completed" : null, // Placeholder
                CreatedAt: wo.ReportedAt
            )).ToArray();

            return Result<WorkOrderDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<WorkOrderDto[]>.Error($"Failed to retrieve asset maintenance history: {ex.Message}");
        }
    }
}
