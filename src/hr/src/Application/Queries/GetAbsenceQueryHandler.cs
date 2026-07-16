using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetAbsenceQuery (detail). Tenant isolation is enforced by RLS on the
/// ID lookup — the repository's documented hybrid pattern.
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
        var absence = await _absenceRepository
            .GetByIdAsync(request.AbsenceId, ct)
            .ConfigureAwait(false);

        if (absence == null)
        {
            return Result<AbsenceDto>.NotFound($"Absence with ID '{request.AbsenceId}' not found");
        }

        var employee = await _employeeRepository
            .GetByIdAsync(absence.EmployeeId, ct)
            .ConfigureAwait(false);

        return Result<AbsenceDto>.Success(HrDtoMapper.ToDto(absence, employee?.Name ?? string.Empty));
    }
}
