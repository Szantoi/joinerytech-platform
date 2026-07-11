using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to get all employees with optional filtering.
/// </summary>
public record GetEmployeesQuery(
    TenantId TenantId,
    Department? Department = null,
    bool? ActiveOnly = true
) : IRequest<Result<List<EmployeeListDto>>>;
