using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetEmployeeAbsencesQuery.
/// </summary>
public class GetEmployeeAbsencesQueryHandler : IRequestHandler<GetEmployeeAbsencesQuery, Result<List<AbsenceListDto>>>
{
    private readonly IAbsenceRepository _absenceRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public GetEmployeeAbsencesQueryHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository)
    {
        _absenceRepository = absenceRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<List<AbsenceListDto>>> Handle(GetEmployeeAbsencesQuery request, CancellationToken ct)
    {
        try
        {
            var absences = await _absenceRepository
                .GetByEmployeeAndYearAsync(request.EmployeeId, request.Year, ct)
                .ConfigureAwait(false);

            // Get employee name
            var employee = await _employeeRepository
                .GetByIdAsync(request.EmployeeId, ct)
                .ConfigureAwait(false);
            var employeeName = employee?.Name ?? "Unknown";

            // Map to DTOs
            var dtos = absences.Select(a => new AbsenceListDto(
                Id: a.Id.Value,
                EmployeeId: a.EmployeeId.Value,
                EmployeeName: employeeName,
                StartDate: a.StartDate.ToDateTime(TimeOnly.MinValue),
                EndDate: a.EndDate.ToDateTime(TimeOnly.MinValue),
                Type: a.Type,
                Status: a.Status,
                CreatedAt: DateTime.UtcNow // NOTE: Domain doesn't track CreatedAt
            )).ToList();

            return Result<List<AbsenceListDto>>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<List<AbsenceListDto>>.Error($"Failed to retrieve employee absences: {ex.Message}");
        }
    }
}
