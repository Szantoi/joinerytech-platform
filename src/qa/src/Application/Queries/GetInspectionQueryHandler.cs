using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetInspectionQuery.
/// </summary>
public class GetInspectionQueryHandler : IRequestHandler<GetInspectionQuery, Result<InspectionDto>>
{
    private readonly IInspectionRepository _inspectionRepository;
    private readonly IQACheckpointRepository _checkpointRepository;

    public GetInspectionQueryHandler(
        IInspectionRepository inspectionRepository,
        IQACheckpointRepository checkpointRepository)
    {
        _inspectionRepository = inspectionRepository;
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<InspectionDto>> Handle(GetInspectionQuery request, CancellationToken ct)
    {
        try
        {
            // Get the inspection
            var inspection = await _inspectionRepository
                .GetByIdAsync(request.InspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (inspection == null)
                return Result<InspectionDto>.NotFound("Inspection not found");

            // Get checkpoint for denormalized CheckpointName
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(inspection.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Map to DTO
            var dto = new InspectionDto(
                Id: inspection.Id.Value,
                CheckpointId: inspection.CheckpointId.Value,
                CheckpointName: checkpoint?.Name ?? "UNKNOWN",
                OrderId: inspection.OrderId,
                ProductId: inspection.ProductId,
                Status: inspection.Status,
                Result: inspection.Result,
                InspectorId: inspection.InspectorId,
                Notes: inspection.Notes,
                FailureNotes: inspection.FailureNotes?.Select(fn => new FailureNoteDto(
                    FailureType: fn.FailureType,
                    Description: fn.Description,
                    PhotoUrl: fn.PhotoUrl
                )).ToArray() ?? Array.Empty<FailureNoteDto>(),
                PlannedAt: inspection.PlannedAt,
                StartedAt: inspection.StartedAt,
                CompletedAt: inspection.CompletedAt
            );

            return Result<InspectionDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<InspectionDto>.Error($"Failed to retrieve inspection: {ex.Message}");
        }
    }
}
