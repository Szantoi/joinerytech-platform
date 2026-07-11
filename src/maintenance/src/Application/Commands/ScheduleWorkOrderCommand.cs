using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to schedule a work order.
/// </summary>
public record ScheduleWorkOrderCommand(
    WorkOrderId WorkOrderId,
    DateTime ScheduledStart,
    decimal EstimatedHours,
    Guid TenantId
) : IRequest<Result>;
