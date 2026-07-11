using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeeQuery.
/// </summary>
public class GetEmployeeQueryHandler : IRequestHandler<GetEmployeeQuery, Result<EmployeeDto>>
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IAbsenceRepository _absenceRepository;

    public GetEmployeeQueryHandler(
        IEmployeeRepository employeeRepository,
        IAbsenceRepository absenceRepository)
    {
        _employeeRepository = employeeRepository;
        _absenceRepository = absenceRepository;
    }

    public async Task<Result<EmployeeDto>> Handle(GetEmployeeQuery request, CancellationToken ct)
    {
        try
        {
            var employee = await _employeeRepository
                .GetByIdAsync(request.EmployeeId, ct)
                .ConfigureAwait(false);

            if (employee == null)
            {
                return Result<EmployeeDto>.NotFound($"Employee with ID '{request.EmployeeId}' not found");
            }

            // Get active absences count
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var activeAbsences = await _absenceRepository
                .GetActiveAbsencesAsync(TenantId.From(employee.TenantId), today, ct)
                .ConfigureAwait(false);
            var activeAbsencesCount = activeAbsences.Count(a => a.EmployeeId == employee.Id);

            // Map to DTO
            var dto = new EmployeeDto(
                Id: employee.Id.Value,
                TenantId: employee.TenantId,
                FirstName: employee.Name.Split(' ').FirstOrDefault() ?? employee.Name,
                LastName: string.Join(" ", employee.Name.Split(' ').Skip(1)),
                Email: employee.Email,
                HireDate: DateTime.UtcNow, // NOTE: Domain doesn't have HireDate - using placeholder
                TerminationDate: employee.Active ? null : DateTime.UtcNow, // NOTE: Domain doesn't have TerminationDate
                JobTitle: employee.Role,
                DepartmentId: Guid.Empty, // NOTE: Domain has Department enum, not Guid
                Skills: employee.Skills.Select(s => s.Key.ToString()).ToArray(),
                TotalCapacityHours: employee.WeeklyHours,
                ActiveAbsences: activeAbsencesCount,
                CreatedAt: DateTime.UtcNow, // NOTE: Domain doesn't track CreatedAt
                UpdatedAt: null // NOTE: Domain doesn't track UpdatedAt
            );

            return Result<EmployeeDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<EmployeeDto>.Error($"Failed to retrieve employee: {ex.Message}");
        }
    }
}
