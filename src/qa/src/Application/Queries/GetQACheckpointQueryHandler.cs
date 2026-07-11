using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetQACheckpointQuery.
/// </summary>
public class GetQACheckpointQueryHandler : IRequestHandler<GetQACheckpointQuery, Result<QACheckpointDto>>
{
    private readonly IQACheckpointRepository _checkpointRepository;

    public GetQACheckpointQueryHandler(IQACheckpointRepository checkpointRepository)
    {
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<QACheckpointDto>> Handle(GetQACheckpointQuery request, CancellationToken ct)
    {
        try
        {
            // Get the checkpoint
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(request.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (checkpoint == null)
                return Result<QACheckpointDto>.NotFound("QA checkpoint not found");

            // Map to DTO
            var dto = new QACheckpointDto(
                Id: checkpoint.Id.Value,
                Name: checkpoint.Name,
                CheckpointType: checkpoint.CheckpointType,
                CriticalLevel: checkpoint.CriticalLevel,
                Description: checkpoint.Description,
                IsActive: checkpoint.IsActive,
                Criteria: checkpoint.Criteria.Select(c => new InspectionCriteriaDto(
                    Id: c.Id,
                    Type: c.Type,
                    Description: c.Description
                )).ToArray(),
                CreatedAt: checkpoint.CreatedAt,
                UpdatedAt: checkpoint.UpdatedAt
            );

            return Result<QACheckpointDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<QACheckpointDto>.Error($"Failed to retrieve QA checkpoint: {ex.Message}");
        }
    }
}
