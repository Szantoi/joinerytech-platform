using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to list absences with the API's optional filters
/// (portal contract: status / empId — both server-side), newest first.
/// </summary>
public record GetAbsencesQuery(
    TenantId TenantId,
    AbsenceStatus? Status = null,
    EmployeeId? EmployeeId = null
) : IRequest<Result<IReadOnlyList<AbsenceDto>>>;
