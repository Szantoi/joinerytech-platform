using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to calculate department capacity for a date range.
/// </summary>
public record GetDepartmentCapacityQuery(
    TenantId TenantId,
    Department Department,
    DateTime StartDate,
    DateTime EndDate
) : IRequest<Result<DepartmentCapacityDto>>;
