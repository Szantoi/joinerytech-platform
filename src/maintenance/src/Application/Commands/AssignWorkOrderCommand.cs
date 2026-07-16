using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to assign a work order to an employee (Internal) or partner (External).
/// Not an FSM transition, but status-guarded (Reported/Scheduled only).
/// Returns the fresh WorkOrderDto (portal UI contract).
/// </summary>
public record AssignWorkOrderCommand(
    WorkOrderId WorkOrderId,
    Guid AssignedTo,
    AssignmentType AssignmentType,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>, IWorkOrderTransitionCommand;
