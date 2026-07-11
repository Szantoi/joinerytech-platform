using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to report a new work order.
/// </summary>
public record ReportWorkOrderCommand(
    AssetId AssetId,
    WorkOrderType Type,
    WorkOrderPriority Priority,
    string Title,
    string Description,
    Guid TenantId
) : IRequest<Result<WorkOrderId>>;
