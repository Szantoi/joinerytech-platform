using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for ApproveAbsenceCommand.
/// </summary>
public class ApproveAbsenceCommandHandler : IRequestHandler<ApproveAbsenceCommand, Result>
{
    private readonly IAbsenceRepository _absenceRepository;

    public ApproveAbsenceCommandHandler(IAbsenceRepository absenceRepository)
    {
        _absenceRepository = absenceRepository;
    }

    public async Task<Result> Handle(ApproveAbsenceCommand request, CancellationToken ct)
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

            // Approve using Domain method (FSM enforced)
            absence.Approve(request.ApprovedByUserId);

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
            return Result.Error($"Failed to approve absence: {ex.Message}");
        }
    }
}
