using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetDepartmentCapacityQuery.
/// </summary>
public class GetDepartmentCapacityQueryHandler : IRequestHandler<GetDepartmentCapacityQuery, Result<DepartmentCapacityDto>>
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IAbsenceRepository _absenceRepository;
    private readonly ICapacityCalculationService _capacityService;

    public GetDepartmentCapacityQueryHandler(
        IEmployeeRepository employeeRepository,
        IAbsenceRepository absenceRepository,
        ICapacityCalculationService capacityService)
    {
        _employeeRepository = employeeRepository;
        _absenceRepository = absenceRepository;
        _capacityService = capacityService;
    }

    public async Task<Result<DepartmentCapacityDto>> Handle(GetDepartmentCapacityQuery request, CancellationToken ct)
    {
        try
        {
            // Get all employees in the department
            var employees = await _employeeRepository
                .GetActiveByDepartmentAsync(request.TenantId, request.Department, ct)
                .ConfigureAwait(false);

            var employeeList = employees.ToList();

            if (!employeeList.Any())
            {
                // Return empty capacity for department with no employees
                return Result<DepartmentCapacityDto>.Success(new DepartmentCapacityDto(
                    DepartmentId: Guid.Empty, // NOTE: Domain has Department enum, not Guid
                    StartDate: request.StartDate,
                    EndDate: request.EndDate,
                    TotalCapacityHours: 0,
                    AvailableHours: 0,
                    Employees: new List<EmployeeCapacityDto>()
                ));
            }

            // Calculate capacity for each employee
            var employeeCapacities = new List<EmployeeCapacityDto>();
            decimal totalDepartmentCapacity = 0;
            decimal totalDepartmentAvailable = 0;

            foreach (var employee in employeeList)
            {
                // Get absences for the date range
                var startYear = request.StartDate.Year;
                var endYear = request.EndDate.Year;
                var absencesQuery = Enumerable.Empty<Domain.Aggregates.Absence>();
                
                for (int year = startYear; year <= endYear; year++)
                {
                    var yearAbsences = await _absenceRepository
                        .GetByEmployeeAndYearAsync(employee.Id, year, ct)
                        .ConfigureAwait(false);
                    absencesQuery = absencesQuery.Concat(yearAbsences);
                }

                var absences = absencesQuery.ToList();

                // Calculate work days
                var totalDays = (request.EndDate - request.StartDate).Days + 1;
                var workDays = Enumerable.Range(0, totalDays)
                    .Select(i => request.StartDate.AddDays(i))
                    .Count(d => d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday);

                var dailyCapacity = _capacityService.CalculateDailyCapacity(employee);
                var employeeCapacity = workDays * dailyCapacity;

                // Calculate absence hours
                var absenceHours = absences
                    .Where(a => a.Status != Domain.Enums.AbsenceStatus.Rejected)
                    .Sum(a => a.WorkDays * dailyCapacity);

                var employeeAvailable = employeeCapacity - absenceHours;

                totalDepartmentCapacity += employeeCapacity;
                totalDepartmentAvailable += employeeAvailable;

                // Map absences to DTOs
                var absenceDtos = absences
                    .Where(a => a.Status != Domain.Enums.AbsenceStatus.Rejected)
                    .Select(a => new AbsenceListDto(
                        Id: a.Id.Value,
                        EmployeeId: a.EmployeeId.Value,
                        EmployeeName: employee.Name,
                        StartDate: a.StartDate.ToDateTime(TimeOnly.MinValue),
                        EndDate: a.EndDate.ToDateTime(TimeOnly.MinValue),
                        Type: a.Type,
                        Status: a.Status,
                        CreatedAt: DateTime.UtcNow // NOTE: Domain doesn't track CreatedAt
                    ))
                    .ToList();

                employeeCapacities.Add(new EmployeeCapacityDto(
                    EmployeeId: employee.Id.Value,
                    EmployeeName: employee.Name,
                    StartDate: request.StartDate,
                    EndDate: request.EndDate,
                    TotalCapacityHours: employeeCapacity,
                    AvailableHours: Math.Max(0, employeeAvailable),
                    Absences: absenceDtos
                ));
            }

            var dto = new DepartmentCapacityDto(
                DepartmentId: Guid.Empty, // NOTE: Domain has Department enum, not Guid
                StartDate: request.StartDate,
                EndDate: request.EndDate,
                TotalCapacityHours: totalDepartmentCapacity,
                AvailableHours: Math.Max(0, totalDepartmentAvailable),
                Employees: employeeCapacities
            );

            return Result<DepartmentCapacityDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<DepartmentCapacityDto>.Error($"Failed to calculate department capacity: {ex.Message}");
        }
    }
}
