using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CreateQACheckpointCommand.
/// </summary>
public class CreateQACheckpointCommandHandler : IRequestHandler<CreateQACheckpointCommand, Result<QACheckpointId>>
{
    private readonly IQACheckpointRepository _checkpointRepository;

    public CreateQACheckpointCommandHandler(IQACheckpointRepository checkpointRepository)
    {
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<QACheckpointId>> Handle(CreateQACheckpointCommand request, CancellationToken ct)
    {
        try
        {
            // Create the QA checkpoint
            var checkpoint = QACheckpoint.Create(
                request.TenantId,
                request.Name,
                request.CheckpointType,
                request.CriticalLevel,
                request.Description);

            // Save to repository
            await _checkpointRepository.AddAsync(checkpoint, ct).ConfigureAwait(false);

            return Result<QACheckpointId>.Success(checkpoint.Id);
        }
        catch (Exception ex)
        {
            return Result<QACheckpointId>.Error($"Failed to create QA checkpoint: {ex.Message}");
        }
    }
}
