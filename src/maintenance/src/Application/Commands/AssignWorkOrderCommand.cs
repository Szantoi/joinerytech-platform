using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to assign a work order to an employee or partner.
/// </summary>
public record AssignWorkOrderCommand(
    WorkOrderId WorkOrderId,
    Guid AssignedTo,
    AssignmentType AssignmentType,
    Guid TenantId
) : IRequest<Result>;
