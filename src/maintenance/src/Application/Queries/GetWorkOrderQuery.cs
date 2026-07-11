using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get a single work order by ID.
/// </summary>
public record GetWorkOrderQuery(
    WorkOrderId WorkOrderId,
    Guid TenantId
) : IRequest<Result<WorkOrderDto>>;
