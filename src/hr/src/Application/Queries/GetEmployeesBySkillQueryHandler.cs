using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeesBySkillQuery.
/// </summary>
public class GetEmployeesBySkillQueryHandler : IRequestHandler<GetEmployeesBySkillQuery, Result<List<EmployeeListDto>>>
{
    private readonly IEmployeeRepository _employeeRepository;

    public GetEmployeesBySkillQueryHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<List<EmployeeListDto>>> Handle(GetEmployeesBySkillQuery request, CancellationToken ct)
    {
        try
        {
            var employees = await _employeeRepository
                .GetActiveBySkillAsync(request.TenantId, request.SkillKey, ct)
                .ConfigureAwait(false);

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
            return Result<List<EmployeeListDto>>.Error($"Failed to retrieve employees by skill: {ex.Message}");
        }
    }
}
