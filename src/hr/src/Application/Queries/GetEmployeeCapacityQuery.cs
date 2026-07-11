using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to calculate employee capacity for a date range.
/// </summary>
public record GetEmployeeCapacityQuery(
    EmployeeId EmployeeId,
    DateTime StartDate,
    DateTime EndDate
) : IRequest<Result<EmployeeCapacityDto>>;
