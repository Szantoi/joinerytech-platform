using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>Marker for the absence FSM transition commands (approve/reject/start/complete/reopen).</summary>
public interface IAbsenceTransitionCommand
{
    AbsenceId AbsenceId { get; }
}

/// <summary>
/// Shared pipeline for every absence FSM transition:
/// load aggregate → apply the domain action → persist → return the FRESH AbsenceDto
/// (portal contract: the UI reconciles its optimistic update from the response).
/// Mirrors the Maintenance WorkOrderTransitionHandlerBase precedent.
///
/// Error contract (mirrors the portal MSW handlers):
///   missing absence          → Result.NotFound (API 404)
///   forbidden FSM transition → Result.Conflict (API 409) — InvalidStatusTransitionException
///   payload validation       → Result.Invalid  (API 400) — DomainException
/// </summary>
public abstract class AbsenceTransitionHandlerBase<TCommand> : IRequestHandler<TCommand, Result<AbsenceDto>>
    where TCommand : IAbsenceTransitionCommand, IRequest<Result<AbsenceDto>>
{
    private readonly IAbsenceRepository _absenceRepository;
    private readonly IEmployeeRepository _employeeRepository;
    private readonly ILogger _logger;

    protected AbsenceTransitionHandlerBase(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository,
        ILogger logger)
    {
        _absenceRepository = absenceRepository;
        _employeeRepository = employeeRepository;
        _logger = logger;
    }

    /// <summary>Action name used in log entries and messages (e.g. "approve").</summary>
    protected abstract string ActionName { get; }

    /// <summary>Executes the aggregate action (may throw domain exceptions).</summary>
    protected abstract void Apply(Absence absence, TCommand request);

    public async Task<Result<AbsenceDto>> Handle(TCommand request, CancellationToken ct)
    {
        var absence = await _absenceRepository
            .GetByIdAsync(request.AbsenceId, ct)
            .ConfigureAwait(false);

        if (absence == null)
        {
            return Result<AbsenceDto>.NotFound($"Absence with ID '{request.AbsenceId}' not found");
        }

        var previousStatus = absence.Status;

        try
        {
            Apply(absence, request);
        }
        catch (InvalidStatusTransitionException ex)
        {
            _logger.LogWarning(
                "Absence {AbsenceId} {Action} rejected (status: {Status}): {Reason}",
                request.AbsenceId.Value, ActionName, previousStatus, ex.Message);
            return Result<AbsenceDto>.Conflict(ex.Message);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(
                "Absence {AbsenceId} {Action} payload rejected: {Reason}",
                request.AbsenceId.Value, ActionName, ex.Message);
            return Result<AbsenceDto>.Invalid(new ValidationError(ex.Message));
        }

        await _absenceRepository.UpdateAsync(absence, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Absence {AbsenceId} {Action} executed ({PreviousStatus} → {Status})",
            request.AbsenceId.Value, ActionName, previousStatus, absence.Status);

        var employee = await _employeeRepository
            .GetByIdAsync(absence.EmployeeId, ct)
            .ConfigureAwait(false);

        return Result<AbsenceDto>.Success(HrDtoMapper.ToDto(absence, employee?.Name ?? string.Empty));
    }
}
