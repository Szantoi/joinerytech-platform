using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query for the server-computed weekly capacity grid (GET /api/hr/capacity?week=).
/// <paramref name="Week"/> must be a Monday — the endpoint rejects anything else with 400.
/// </summary>
public record GetWeekCapacityQuery(
    TenantId TenantId,
    DateOnly Week
) : IRequest<Result<WeekCapacityDto>>;
