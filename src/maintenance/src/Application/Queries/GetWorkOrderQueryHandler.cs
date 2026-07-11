using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetWorkOrderQuery.
/// </summary>
public class GetWorkOrderQueryHandler : IRequestHandler<GetWorkOrderQuery, Result<WorkOrderDto>>
{
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetRepository _assetRepository;

    public GetWorkOrderQueryHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository)
    {
        _workOrderRepository = workOrderRepository;
        _assetRepository = assetRepository;
    }

    public async Task<Result<WorkOrderDto>> Handle(GetWorkOrderQuery request, CancellationToken ct)
    {
        try
        {
            var workOrder = await _workOrderRepository
                .GetByIdAsync(request.WorkOrderId, ct)
                .ConfigureAwait(false);

            if (workOrder == null)
            {
                return Result<WorkOrderDto>.NotFound($"Work order with ID '{request.WorkOrderId}' not found");
            }

            // Get asset for denormalized AssetCode
            var asset = await _assetRepository
                .GetByIdAsync(workOrder.AssetId, ct)
                .ConfigureAwait(false);

            // Map to DTO
            var dto = new WorkOrderDto(
                Id: workOrder.Id.Value,
                AssetId: workOrder.AssetId.Value,
                AssetCode: asset?.Code ?? "UNKNOWN",
                Type: workOrder.Type,
                Priority: workOrder.Priority,
                Status: workOrder.Status,
                Title: workOrder.Title,
                Description: workOrder.Description,
                ScheduledStart: workOrder.ScheduledAt,
                EstimatedHours: workOrder.EstimatedHours,
                ActualHours: workOrder.ActualHours,
                AssignedTo: workOrder.AssignedEmployeeId ?? workOrder.AssignedPartnerId,
                AssignmentType: workOrder.AssignmentType,
                RequiresDowntime: workOrder.RequiresDowntime,
                Parts: workOrder.Parts.Select(p => new WorkOrderPartDto(
                    CatalogCode: p.CatalogCode,
                    Quantity: p.Quantity,
                    UnitPrice: p.UnitPrice.Amount,
                    TotalPrice: p.TotalPrice.Amount
                )).ToArray(),
                TotalPartsCost: workOrder.Parts.Sum(p => p.TotalPrice.Amount),
                CompletionNote: workOrder.ActualHours.HasValue ? "Completed" : null, // Placeholder
                CreatedAt: workOrder.ReportedAt
            );

            return Result<WorkOrderDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<WorkOrderDto>.Error($"Failed to retrieve work order: {ex.Message}");
        }
    }
}
