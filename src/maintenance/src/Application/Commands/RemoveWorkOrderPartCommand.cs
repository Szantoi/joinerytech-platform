using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to remove a part from a work order.
/// </summary>
public record RemoveWorkOrderPartCommand(
    WorkOrderId WorkOrderId,
    int PartIndex,
    Guid TenantId
) : IRequest<Result>;
