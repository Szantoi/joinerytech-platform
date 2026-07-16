using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to reject a work order (FSM: Reported/Scheduled → Rejected, reason required).
/// Returns the fresh WorkOrderDto (portal UI contract).
/// </summary>
public record RejectWorkOrderCommand(
    WorkOrderId WorkOrderId,
    string Reason,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>, IWorkOrderTransitionCommand;
