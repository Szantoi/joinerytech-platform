using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to add a part to a work order.
/// </summary>
public record AddWorkOrderPartCommand(
    WorkOrderId WorkOrderId,
    string PartName,
    int Quantity,
    decimal UnitPrice,
    Guid TenantId
) : IRequest<Result>;
