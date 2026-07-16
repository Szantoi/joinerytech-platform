using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.HR.Application.Configuration;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeesQuery — the filtering happens in the repository (SQL),
/// not in memory. Pay grade hourly rates come from tenant configuration
/// ("Hr:PayGrades", options pattern — ADR-060), resolved once per handler.
/// </summary>
public class GetEmployeesQueryHandler : IRequestHandler<GetEmployeesQuery, Result<IReadOnlyList<EmployeeDto>>>
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly HrPayGradeConfiguration _payGrades;

    public GetEmployeesQueryHandler(
        IEmployeeRepository employeeRepository,
        IOptions<HrPayGradesOptions> payGradeOptions)
    {
        _employeeRepository = employeeRepository;
        _payGrades = payGradeOptions.Value.ToConfiguration();
    }

    public async Task<Result<IReadOnlyList<EmployeeDto>>> Handle(GetEmployeesQuery request, CancellationToken ct)
    {
        var employees = await _employeeRepository
            .ListAsync(
                request.TenantId,
                request.Department,
                request.Skill,
                request.SearchText,
                request.ActiveOnly,
                ct)
            .ConfigureAwait(false);

        IReadOnlyList<EmployeeDto> dtos = employees
            .Select(employee => HrDtoMapper.ToDto(employee, _payGrades))
            .ToList();

        return Result<IReadOnlyList<EmployeeDto>>.Success(dtos);
    }
}
