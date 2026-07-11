using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetInspectionsByCheckpointQuery.
/// </summary>
public class GetInspectionsByCheckpointQueryHandler : IRequestHandler<GetInspectionsByCheckpointQuery, Result<InspectionListDto[]>>
{
    private readonly IInspectionRepository _inspectionRepository;
    private readonly IQACheckpointRepository _checkpointRepository;

    public GetInspectionsByCheckpointQueryHandler(
        IInspectionRepository inspectionRepository,
        IQACheckpointRepository checkpointRepository)
    {
        _inspectionRepository = inspectionRepository;
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<InspectionListDto[]>> Handle(GetInspectionsByCheckpointQuery request, CancellationToken ct)
    {
        try
        {
            // Get inspections by checkpoint
            var inspections = await _inspectionRepository
                .GetByCheckpointIdAsync(request.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Get checkpoint name
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(request.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            var checkpointName = checkpoint?.Name ?? "UNKNOWN";

            // Map to list DTOs
            var dtos = inspections.Select(i => new InspectionListDto(
                Id: i.Id.Value,
                CheckpointId: i.CheckpointId.Value,
                CheckpointName: checkpointName,
                Status: i.Status,
                Result: i.Result,
                InspectorId: i.InspectorId,
                PlannedAt: i.PlannedAt,
                CompletedAt: i.CompletedAt
            )).ToArray();

            return Result<InspectionListDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<InspectionListDto[]>.Error($"Failed to retrieve inspections by checkpoint: {ex.Message}");
        }
    }
}
