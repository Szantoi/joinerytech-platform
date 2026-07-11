using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetInspectionsByOrderQuery.
/// </summary>
public class GetInspectionsByOrderQueryHandler : IRequestHandler<GetInspectionsByOrderQuery, Result<InspectionListDto[]>>
{
    private readonly IInspectionRepository _inspectionRepository;
    private readonly IQACheckpointRepository _checkpointRepository;

    public GetInspectionsByOrderQueryHandler(
        IInspectionRepository inspectionRepository,
        IQACheckpointRepository checkpointRepository)
    {
        _inspectionRepository = inspectionRepository;
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<InspectionListDto[]>> Handle(GetInspectionsByOrderQuery request, CancellationToken ct)
    {
        try
        {
            // Get inspections by order
            var inspections = await _inspectionRepository
                .GetByOrderIdAsync(request.OrderId, request.TenantId, ct)
                .ConfigureAwait(false);

            var inspectionList = inspections.ToList();

            // Get checkpoints for denormalized CheckpointName
            var checkpointTasks = inspectionList.Select(i =>
                _checkpointRepository.GetByIdAsync(i.CheckpointId, request.TenantId, ct));
            var checkpointResults = await Task.WhenAll(checkpointTasks).ConfigureAwait(false);

            var checkpointDict = new Dictionary<Guid, string>();
            foreach (var checkpoint in checkpointResults)
            {
                if (checkpoint != null)
                {
                    checkpointDict[checkpoint.Id.Value] = checkpoint.Name;
                }
            }

            // Map to list DTOs
            var dtos = inspectionList.Select(i => new InspectionListDto(
                Id: i.Id.Value,
                CheckpointId: i.CheckpointId.Value,
                CheckpointName: checkpointDict.TryGetValue(i.CheckpointId.Value, out var name) ? name : "UNKNOWN",
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
            return Result<InspectionListDto[]>.Error($"Failed to retrieve inspections by order: {ex.Message}");
        }
    }
}
