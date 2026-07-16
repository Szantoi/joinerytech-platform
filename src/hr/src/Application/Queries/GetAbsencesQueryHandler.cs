using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetAbsencesQuery. The employee names are resolved with ONE extra
/// query (name lookup map) instead of a per-row fetch — no N+1.
/// </summary>
public class GetAbsencesQueryHandler : IRequestHandler<GetAbsencesQuery, Result<IReadOnlyList<AbsenceDto>>>
{
    private readonly IAbsenceRepository _absenceRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public GetAbsencesQueryHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository)
    {
        _absenceRepository = absenceRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<IReadOnlyList<AbsenceDto>>> Handle(GetAbsencesQuery request, CancellationToken ct)
    {
        var absences = await _absenceRepository
            .ListAsync(request.TenantId, request.Status, request.EmployeeId, ct)
            .ConfigureAwait(false);

        // Inactive employees keep their absence history — do not filter them out here.
        var employees = await _employeeRepository
            .ListAsync(request.TenantId, activeOnly: false, ct: ct)
            .ConfigureAwait(false);

        var names = employees.ToDictionary(e => e.Id.Value, e => e.Name);

        IReadOnlyList<AbsenceDto> dtos = absences
            .Select(a => HrDtoMapper.ToDto(
                a,
                names.TryGetValue(a.EmployeeId.Value, out var name) ? name : string.Empty))
            .ToList();

        return Result<IReadOnlyList<AbsenceDto>>.Success(dtos);
    }
}
