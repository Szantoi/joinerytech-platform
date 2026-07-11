using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for DeactivateQACheckpointCommand.
/// </summary>
public class DeactivateQACheckpointCommandHandler : IRequestHandler<DeactivateQACheckpointCommand, Result>
{
    private readonly IQACheckpointRepository _checkpointRepository;

    public DeactivateQACheckpointCommandHandler(IQACheckpointRepository checkpointRepository)
    {
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result> Handle(DeactivateQACheckpointCommand request, CancellationToken ct)
    {
        try
        {
            // Get the checkpoint
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(request.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (checkpoint == null)
                return Result.NotFound("QA checkpoint not found");

            // Deactivate the checkpoint
            checkpoint.Deactivate();

            // Save changes
            await _checkpointRepository.UpdateAsync(checkpoint, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to deactivate QA checkpoint: {ex.Message}");
        }
    }
}
