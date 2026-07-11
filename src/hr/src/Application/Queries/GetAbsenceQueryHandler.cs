using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetAbsenceQuery.
/// </summary>
public class GetAbsenceQueryHandler : IRequestHandler<GetAbsenceQuery, Result<AbsenceDto>>
{
    private readonly IAbsenceRepository _absenceRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public GetAbsenceQueryHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository)
    {
        _absenceRepository = absenceRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<AbsenceDto>> Handle(GetAbsenceQuery request, CancellationToken ct)
    {
        try
        {
            var absence = await _absenceRepository
                .GetByIdAsync(request.AbsenceId, ct)
                .ConfigureAwait(false);

            if (absence == null)
            {
                return Result<AbsenceDto>.NotFound($"Absence with ID '{request.AbsenceId}' not found");
            }

            // Get employee name
            var employee = await _employeeRepository
                .GetByIdAsync(absence.EmployeeId, ct)
                .ConfigureAwait(false);
            var employeeName = employee?.Name ?? "Unknown";

            // Map to DTO
            var dto = new AbsenceDto(
                Id: absence.Id.Value,
                EmployeeId: absence.EmployeeId.Value,
                EmployeeName: employeeName,
                StartDate: absence.StartDate.ToDateTime(TimeOnly.MinValue),
                EndDate: absence.EndDate.ToDateTime(TimeOnly.MinValue),
                Type: absence.Type,
                Status: absence.Status,
                Reason: absence.Reason,
                ApproverId: absence.ApprovedByUserId,
                ApprovedAt: absence.ApprovedAt,
                RejectionReason: absence.RejectionReason,
                CreatedAt: DateTime.UtcNow // NOTE: Domain doesn't track CreatedAt
            );

            return Result<AbsenceDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<AbsenceDto>.Error($"Failed to retrieve absence: {ex.Message}");
        }
    }
}
