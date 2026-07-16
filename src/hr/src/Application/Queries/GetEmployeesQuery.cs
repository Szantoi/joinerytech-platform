using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to list employees with the API's optional filters
/// (portal contract: dept / q / skill — all server-side), ordered by name.
/// </summary>
public record GetEmployeesQuery(
    TenantId TenantId,
    Department? Department = null,
    SkillKey? Skill = null,
    string? SearchText = null,
    bool ActiveOnly = true
) : IRequest<Result<IReadOnlyList<EmployeeDto>>>;
