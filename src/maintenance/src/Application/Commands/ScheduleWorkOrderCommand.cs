using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to schedule a work order (FSM: Reported → Scheduled).
/// Returns the fresh WorkOrderDto (portal UI contract).
/// </summary>
public record ScheduleWorkOrderCommand(
    WorkOrderId WorkOrderId,
    DateTime ScheduledStart,
    decimal EstimatedHours,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>, IWorkOrderTransitionCommand;
