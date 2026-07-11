using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to reopen a postponed or rejected work order.
/// </summary>
public record ReopenWorkOrderCommand(
    WorkOrderId WorkOrderId,
    string Reason,
    Guid TenantId
) : IRequest<Result>;
