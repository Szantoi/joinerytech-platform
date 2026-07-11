using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to reject a work order.
/// </summary>
public record RejectWorkOrderCommand(
    WorkOrderId WorkOrderId,
    string Reason,
    Guid TenantId
) : IRequest<Result>;
