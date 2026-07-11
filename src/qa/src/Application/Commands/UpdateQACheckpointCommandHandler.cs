using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for UpdateQACheckpointCommand.
/// </summary>
public class UpdateQACheckpointCommandHandler : IRequestHandler<UpdateQACheckpointCommand, Result>
{
    private readonly IQACheckpointRepository _checkpointRepository;

    public UpdateQACheckpointCommandHandler(IQACheckpointRepository checkpointRepository)
    {
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result> Handle(UpdateQACheckpointCommand request, CancellationToken ct)
    {
        try
        {
            // Get the checkpoint
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(request.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (checkpoint == null)
                return Result.NotFound("QA checkpoint not found");

            // Update the checkpoint
            checkpoint.Update(
                request.Name,
                request.CriticalLevel,
                request.Description);

            // Save changes
            await _checkpointRepository.UpdateAsync(checkpoint, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to update QA checkpoint: {ex.Message}");
        }
    }
}
