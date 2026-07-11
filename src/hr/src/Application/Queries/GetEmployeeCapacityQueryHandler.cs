using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeeCapacityQuery.
/// </summary>
public class GetEmployeeCapacityQueryHandler : IRequestHandler<GetEmployeeCapacityQuery, Result<EmployeeCapacityDto>>
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IAbsenceRepository _absenceRepository;
    private readonly ICapacityCalculationService _capacityService;

    public GetEmployeeCapacityQueryHandler(
        IEmployeeRepository employeeRepository,
        IAbsenceRepository absenceRepository,
        ICapacityCalculationService capacityService)
    {
        _employeeRepository = employeeRepository;
        _absenceRepository = absenceRepository;
        _capacityService = capacityService;
    }

    public async Task<Result<EmployeeCapacityDto>> Handle(GetEmployeeCapacityQuery request, CancellationToken ct)
    {
        try
        {
            var employee = await _employeeRepository
                .GetByIdAsync(request.EmployeeId, ct)
                .ConfigureAwait(false);

            if (employee == null)
            {
                return Result<EmployeeCapacityDto>.NotFound($"Employee with ID '{request.EmployeeId}' not found");
            }

            // Get absences for the date range
            var startYear = request.StartDate.Year;
            var endYear = request.EndDate.Year;
            var absencesQuery = Enumerable.Empty<Domain.Aggregates.Absence>();
            
            for (int year = startYear; year <= endYear; year++)
            {
                var yearAbsences = await _absenceRepository
                    .GetByEmployeeAndYearAsync(request.EmployeeId, year, ct)
                    .ConfigureAwait(false);
                absencesQuery = absencesQuery.Concat(yearAbsences);
            }

            var absences = absencesQuery.ToList();

            // Calculate total capacity hours (assuming 5-day work week)
            var totalDays = (request.EndDate - request.StartDate).Days + 1;
            var workDays = Enumerable.Range(0, totalDays)
                .Select(i => request.StartDate.AddDays(i))
                .Count(d => d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday);

            var dailyCapacity = _capacityService.CalculateDailyCapacity(employee);
            var totalCapacityHours = workDays * dailyCapacity;

            // Calculate absence hours
            var absenceHours = absences
                .Where(a => a.Status != Domain.Enums.AbsenceStatus.Rejected)
                .Sum(a => a.WorkDays * dailyCapacity);

            var availableHours = totalCapacityHours - absenceHours;

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

            var dto = new EmployeeCapacityDto(
                EmployeeId: employee.Id.Value,
                EmployeeName: employee.Name,
                StartDate: request.StartDate,
                EndDate: request.EndDate,
                TotalCapacityHours: totalCapacityHours,
                AvailableHours: Math.Max(0, availableHours),
                Absences: absenceDtos
            );

            return Result<EmployeeCapacityDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<EmployeeCapacityDto>.Error($"Failed to calculate employee capacity: {ex.Message}");
        }
    }
}
