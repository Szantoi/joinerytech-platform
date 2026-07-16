using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.HR.Application.Configuration;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeeQuery (detail). Tenant isolation is enforced by RLS on the
/// ID lookup — the repository's documented hybrid pattern. Pay grade hourly rates come
/// from tenant configuration ("Hr:PayGrades", options pattern — ADR-060).
/// </summary>
public class GetEmployeeQueryHandler : IRequestHandler<GetEmployeeQuery, Result<EmployeeDto>>
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly HrPayGradeConfiguration _payGrades;

    public GetEmployeeQueryHandler(
        IEmployeeRepository employeeRepository,
        IOptions<HrPayGradesOptions> payGradeOptions)
    {
        _employeeRepository = employeeRepository;
        _payGrades = payGradeOptions.Value.ToConfiguration();
    }

    public async Task<Result<EmployeeDto>> Handle(GetEmployeeQuery request, CancellationToken ct)
    {
        var employee = await _employeeRepository
            .GetByIdAsync(request.EmployeeId, ct)
            .ConfigureAwait(false);

        return employee == null
            ? Result<EmployeeDto>.NotFound($"Employee with ID '{request.EmployeeId}' not found")
            : Result<EmployeeDto>.Success(HrDtoMapper.ToDto(employee, _payGrades));
    }
}
