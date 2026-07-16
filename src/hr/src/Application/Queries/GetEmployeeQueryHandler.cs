using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeeQuery (detail). Tenant isolation is enforced by RLS on the
/// ID lookup — the repository's documented hybrid pattern.
/// </summary>
public class GetEmployeeQueryHandler : IRequestHandler<GetEmployeeQuery, Result<EmployeeDto>>
{
    private readonly IEmployeeRepository _employeeRepository;

    public GetEmployeeQueryHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<EmployeeDto>> Handle(GetEmployeeQuery request, CancellationToken ct)
    {
        var employee = await _employeeRepository
            .GetByIdAsync(request.EmployeeId, ct)
            .ConfigureAwait(false);

        return employee == null
            ? Result<EmployeeDto>.NotFound($"Employee with ID '{request.EmployeeId}' not found")
            : Result<EmployeeDto>.Success(HrDtoMapper.ToDto(employee));
    }
}
