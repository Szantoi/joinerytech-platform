using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeesQuery.
/// </summary>
public class GetEmployeesQueryHandler : IRequestHandler<GetEmployeesQuery, Result<List<EmployeeListDto>>>
{
    private readonly IEmployeeRepository _employeeRepository;

    public GetEmployeesQueryHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<List<EmployeeListDto>>> Handle(GetEmployeesQuery request, CancellationToken ct)
    {
        try
        {
            IEnumerable<Domain.Aggregates.Employee> employees;

            if (request.Department.HasValue)
            {
                employees = await _employeeRepository
                    .GetActiveByDepartmentAsync(request.TenantId, request.Department.Value, ct)
                    .ConfigureAwait(false);
            }
            else
            {
                // TODO: Repository doesn't have GetAll method - using GetActiveByDepartment workaround
                // For now, return empty list - needs repository enhancement
                employees = Enumerable.Empty<Domain.Aggregates.Employee>();
            }

            // Filter by Active if requested
            if (request.ActiveOnly == true)
            {
                employees = employees.Where(e => e.Active);
            }

            // Map to DTOs
            var dtos = employees.Select(e => new EmployeeListDto(
                Id: e.Id.Value,
                FullName: e.Name,
                Email: e.Email,
                JobTitle: e.Role,
                DepartmentId: Guid.Empty, // NOTE: Domain has Department enum, not Guid
                IsActive: e.Active,
                HireDate: DateTime.UtcNow // NOTE: Domain doesn't have HireDate
            )).ToList();

            return Result<List<EmployeeListDto>>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<List<EmployeeListDto>>.Error($"Failed to retrieve employees: {ex.Message}");
        }
    }
}
