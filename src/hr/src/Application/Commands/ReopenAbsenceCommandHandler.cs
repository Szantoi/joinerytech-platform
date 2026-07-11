using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for ReopenAbsenceCommand.
/// </summary>
public class ReopenAbsenceCommandHandler : IRequestHandler<ReopenAbsenceCommand, Result>
{
    private readonly IAbsenceRepository _absenceRepository;

    public ReopenAbsenceCommandHandler(IAbsenceRepository absenceRepository)
    {
        _absenceRepository = absenceRepository;
    }

    public async Task<Result> Handle(ReopenAbsenceCommand request, CancellationToken ct)
    {
        try
        {
            var absence = await _absenceRepository
                .GetByIdAsync(request.AbsenceId, ct)
                .ConfigureAwait(false);

            if (absence == null)
            {
                return Result.NotFound($"Absence with ID '{request.AbsenceId}' not found");
            }

            // Reopen using Domain method (FSM enforced: only Rejected → Pending)
            absence.Reopen();

            // Persist changes
            await _absenceRepository.UpdateAsync(absence, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (ArgumentException ex)
        {
            return Result.Error(ex.Message);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to reopen absence: {ex.Message}");
        }
    }
}
