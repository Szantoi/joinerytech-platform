using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for ReactivateQACheckpointCommand.
/// </summary>
public class ReactivateQACheckpointCommandHandler : IRequestHandler<ReactivateQACheckpointCommand, Result>
{
    private readonly IQACheckpointRepository _checkpointRepository;

    public ReactivateQACheckpointCommandHandler(IQACheckpointRepository checkpointRepository)
    {
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result> Handle(ReactivateQACheckpointCommand request, CancellationToken ct)
    {
        try
        {
            // Get the checkpoint
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(request.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (checkpoint == null)
                return Result.NotFound("QA checkpoint not found");

            // Reactivate the checkpoint
            checkpoint.Reactivate();

            // Save changes
            await _checkpointRepository.UpdateAsync(checkpoint, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to reactivate QA checkpoint: {ex.Message}");
        }
    }
}
