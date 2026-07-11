using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for RejectAbsenceCommand.
/// </summary>
public class RejectAbsenceCommandHandler : IRequestHandler<RejectAbsenceCommand, Result>
{
    private readonly IAbsenceRepository _absenceRepository;

    public RejectAbsenceCommandHandler(IAbsenceRepository absenceRepository)
    {
        _absenceRepository = absenceRepository;
    }

    public async Task<Result> Handle(RejectAbsenceCommand request, CancellationToken ct)
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

            // Reject using Domain method (FSM enforced)
            absence.Reject(request.RejectedByUserId, request.RejectionReason);

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
            return Result.Error($"Failed to reject absence: {ex.Message}");
        }
    }
}
