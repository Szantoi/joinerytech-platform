using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to get a single employee by ID.
/// </summary>
public record GetEmployeeQuery(EmployeeId EmployeeId) : IRequest<Result<EmployeeDto>>;
