using SpaceOS.Modules.Maintenance.Domain.Aggregates;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Single place for WorkOrder → WorkOrderDto mapping — used by the detail query
/// and by every transition command handler (the transition endpoints return the
/// fresh aggregate state as WorkOrderDto per the portal UI contract).
/// </summary>
public static class WorkOrderDtoMapper
{
    /// <summary>Fallback asset code/name when the referenced asset cannot be loaded.</summary>
    public const string UnknownAssetCode = "UNKNOWN";

    /// <summary>
    /// Maps the aggregate to its full DTO. <paramref name="assetCode"/> and
    /// <paramref name="assetName"/> are the denormalized fields of the referenced
    /// asset (null → <see cref="UnknownAssetCode"/>).
    /// </summary>
    public static WorkOrderDto ToDto(WorkOrder workOrder, string? assetCode, string? assetName = null)
    {
        return new WorkOrderDto(
            Id: workOrder.Id.Value,
            AssetId: workOrder.AssetId.Value,
            AssetCode: assetCode ?? UnknownAssetCode,
            AssetName: assetName ?? UnknownAssetCode,
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
            StartedAt: workOrder.StartedAt,
            CompletedAt: workOrder.CompletedAt,
            PostponementReason: workOrder.PostponementReason,
            RejectionReason: workOrder.RejectionReason,
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
    }
}
