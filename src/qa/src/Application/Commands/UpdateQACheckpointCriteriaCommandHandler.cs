using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for UpdateQACheckpointCriteriaCommand.
/// Updates the inspection criteria for a checkpoint (owned collection).
/// </summary>
public class UpdateQACheckpointCriteriaCommandHandler : IRequestHandler<UpdateQACheckpointCriteriaCommand, Result>
{
    private readonly IQACheckpointRepository _repository;

    public UpdateQACheckpointCriteriaCommandHandler(IQACheckpointRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result> Handle(UpdateQACheckpointCriteriaCommand request, CancellationToken ct)
    {
        try
        {
            var checkpoint = await _repository.GetByIdAsync(
                new QACheckpointId(request.CheckpointId),
                TenantId.From(request.TenantId),
                ct
            ).ConfigureAwait(false);

            if (checkpoint == null)
                return Result.NotFound($"Checkpoint {request.CheckpointId} not found");

            // Clear existing criteria and add new ones
            // First, remove all existing criteria
            var existingCriteria = checkpoint.Criteria.ToList();
            foreach (var criteria in existingCriteria)
            {
                checkpoint.RemoveCriteria(criteria.Id);
            }

            // Add new criteria
            foreach (var criteriaItem in request.Criteria)
            {
                checkpoint.AddCriteria(criteriaItem.Type, criteriaItem.Description);
            }

            await _repository.UpdateAsync(checkpoint, ct).ConfigureAwait(false);
            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to update checkpoint criteria: {ex.Message}");
        }
    }
}
