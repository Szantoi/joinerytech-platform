using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to postpone a work order (FSM: Scheduled/InProgress → Postponed, reason required).
/// Returns the fresh WorkOrderDto (portal UI contract).
/// </summary>
public record PostponeWorkOrderCommand(
    WorkOrderId WorkOrderId,
    string Reason,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>, IWorkOrderTransitionCommand;
