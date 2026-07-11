using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetCheckpointsByTypeQuery.
/// </summary>
public class GetCheckpointsByTypeQueryHandler : IRequestHandler<GetCheckpointsByTypeQuery, Result<QACheckpointListDto[]>>
{
    private readonly IQACheckpointRepository _checkpointRepository;

    public GetCheckpointsByTypeQueryHandler(IQACheckpointRepository checkpointRepository)
    {
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<QACheckpointListDto[]>> Handle(GetCheckpointsByTypeQuery request, CancellationToken ct)
    {
        try
        {
            // Get checkpoints by type
            var checkpoints = await _checkpointRepository
                .GetByTypeAsync(request.TenantId, request.CheckpointType.ToString(), ct)
                .ConfigureAwait(false);

            // Map to list DTOs
            var dtos = checkpoints.Select(c => new QACheckpointListDto(
                Id: c.Id.Value,
                Name: c.Name,
                CheckpointType: c.CheckpointType,
                CriticalLevel: c.CriticalLevel,
                IsActive: c.IsActive,
                CriteriaCount: c.Criteria.Count,
                CreatedAt: c.CreatedAt
            )).ToArray();

            return Result<QACheckpointListDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<QACheckpointListDto[]>.Error($"Failed to retrieve checkpoints by type: {ex.Message}");
        }
    }
}
