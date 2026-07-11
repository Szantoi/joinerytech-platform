using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetPendingAbsencesQuery.
/// </summary>
public class GetPendingAbsencesQueryHandler : IRequestHandler<GetPendingAbsencesQuery, Result<List<AbsenceListDto>>>
{
    private readonly IAbsenceRepository _absenceRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public GetPendingAbsencesQueryHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository)
    {
        _absenceRepository = absenceRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<List<AbsenceListDto>>> Handle(GetPendingAbsencesQuery request, CancellationToken ct)
    {
        try
        {
            var absences = await _absenceRepository
                .GetPendingAsync(request.TenantId, ct)
                .ConfigureAwait(false);

            // Get employee names (could be optimized with a batch query)
            var dtos = new List<AbsenceListDto>();
            foreach (var absence in absences)
            {
                var employee = await _employeeRepository
                    .GetByIdAsync(absence.EmployeeId, ct)
                    .ConfigureAwait(false);
                
                dtos.Add(new AbsenceListDto(
                    Id: absence.Id.Value,
                    EmployeeId: absence.EmployeeId.Value,
                    EmployeeName: employee?.Name ?? "Unknown",
                    StartDate: absence.StartDate.ToDateTime(TimeOnly.MinValue),
                    EndDate: absence.EndDate.ToDateTime(TimeOnly.MinValue),
                    Type: absence.Type,
                    Status: absence.Status,
                    CreatedAt: DateTime.UtcNow // NOTE: Domain doesn't track CreatedAt
                ));
            }

            return Result<List<AbsenceListDto>>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<List<AbsenceListDto>>.Error($"Failed to retrieve pending absences: {ex.Message}");
        }
    }
}
