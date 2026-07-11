using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to start work on a work order.
/// CRITICAL: RequiresDowntime flag is used by Production module for capacity planning.
/// </summary>
public record StartWorkOrderCommand(
    WorkOrderId WorkOrderId,
    bool RequiresDowntime,
    Guid TenantId
) : IRequest<Result>;
