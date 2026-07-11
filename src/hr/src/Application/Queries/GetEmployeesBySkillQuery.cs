using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to get employees by skill.
/// </summary>
public record GetEmployeesBySkillQuery(
    TenantId TenantId,
    SkillKey SkillKey
) : IRequest<Result<List<EmployeeListDto>>>;
