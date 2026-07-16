using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to reopen a postponed or rejected work order
/// (FSM: Postponed/Rejected → Reported — assignment, schedule and reasons are cleared).
/// The portal contract sends no payload, so the command carries no reason.
/// Returns the fresh WorkOrderDto (portal UI contract).
/// </summary>
public record ReopenWorkOrderCommand(
    WorkOrderId WorkOrderId,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>, IWorkOrderTransitionCommand;
