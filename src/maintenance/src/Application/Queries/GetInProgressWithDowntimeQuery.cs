using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get in-progress work orders that require downtime.
/// CRITICAL: Used by Production module for capacity planning.
/// </summary>
public record GetInProgressWithDowntimeQuery(
    Guid TenantId
) : IRequest<Result<WorkOrderDto[]>>;
