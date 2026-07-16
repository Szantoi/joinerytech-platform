using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to start work on a work order (FSM: Scheduled → InProgress, assignment required).
/// NOTE: RequiresDowntime is fixed at creation time on the aggregate — the start payload
/// is empty (portal contract); the WorkOrderStartedEvent carries the stored flag for the
/// Production integration.
/// Returns the fresh WorkOrderDto (portal UI contract).
/// </summary>
public record StartWorkOrderCommand(
    WorkOrderId WorkOrderId,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>, IWorkOrderTransitionCommand;
