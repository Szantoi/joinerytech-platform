using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get pending (Reported status) work orders.
/// </summary>
public record GetPendingWorkOrdersQuery(
    Guid TenantId
) : IRequest<Result<WorkOrderDto[]>>;
