using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeesQuery — the filtering happens in the repository (SQL),
/// not in memory.
/// </summary>
public class GetEmployeesQueryHandler : IRequestHandler<GetEmployeesQuery, Result<IReadOnlyList<EmployeeDto>>>
{
    private readonly IEmployeeRepository _employeeRepository;

    public GetEmployeesQueryHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
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

        IReadOnlyList<EmployeeDto> dtos = employees.Select(HrDtoMapper.ToDto).ToList();

        return Result<IReadOnlyList<EmployeeDto>>.Success(dtos);
    }
}
