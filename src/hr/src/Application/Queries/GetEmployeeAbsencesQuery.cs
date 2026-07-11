using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to get all absences for an employee in a given year.
/// </summary>
public record GetEmployeeAbsencesQuery(
    EmployeeId EmployeeId,
    int Year
) : IRequest<Result<List<AbsenceListDto>>>;
