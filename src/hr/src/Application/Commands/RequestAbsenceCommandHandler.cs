using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for RequestAbsenceCommand.
/// </summary>
public class RequestAbsenceCommandHandler : IRequestHandler<RequestAbsenceCommand, Result<AbsenceId>>
{
    private readonly IAbsenceRepository _absenceRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public RequestAbsenceCommandHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository)
    {
        _absenceRepository = absenceRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<AbsenceId>> Handle(RequestAbsenceCommand request, CancellationToken ct)
    {
        try
        {
            // Verify employee exists
            var employee = await _employeeRepository
                .GetByIdAsync(request.EmployeeId, ct)
                .ConfigureAwait(false);

            if (employee == null)
            {
                return Result<AbsenceId>.NotFound($"Employee with ID '{request.EmployeeId}' not found");
            }

            // Convert DateTime to DateOnly (Domain expects DateOnly)
            var startDate = DateOnly.FromDateTime(request.StartDate);
            var endDate = DateOnly.FromDateTime(request.EndDate);

            // Create absence aggregate using factory method
            var absence = Absence.Create(
                request.TenantId,
                request.EmployeeId,
                request.Type,
                startDate,
                endDate,
                request.Reason);

            // Persist the absence
            await _absenceRepository.AddAsync(absence, ct).ConfigureAwait(false);

            return Result<AbsenceId>.Success(absence.Id);
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors
            return Result<AbsenceId>.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors
            return Result<AbsenceId>.Error($"Failed to request absence: {ex.Message}");
        }
    }
}
