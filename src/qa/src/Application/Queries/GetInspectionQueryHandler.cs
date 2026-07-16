using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.FSM;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetInspectionQuery.
/// ADR-063: also surfaces OpenTicketId (newest open ticket linked to the
/// inspection) so the portal can derive its "javitasra" view-state from a
/// single fetch (Completed + Conditional + open ticket).
/// </summary>
public class GetInspectionQueryHandler : IRequestHandler<GetInspectionQuery, Result<InspectionDto>>
{
    private readonly IInspectionRepository _inspectionRepository;
    private readonly IQACheckpointRepository _checkpointRepository;
    private readonly ITicketRepository _ticketRepository;

    public GetInspectionQueryHandler(
        IInspectionRepository inspectionRepository,
        IQACheckpointRepository checkpointRepository,
        ITicketRepository ticketRepository)
    {
        _inspectionRepository = inspectionRepository;
        _checkpointRepository = checkpointRepository;
        _ticketRepository = ticketRepository;
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

            // ADR-063: newest open ticket linked to this inspection (rework trail);
            // open-guard is the domain FSM's IsOpen (portal TICKET_OPEN_STATUSES mirror)
            var linkedTickets = await _ticketRepository
                .GetByInspectionIdAsync(inspection.Id.Value, request.TenantId, ct)
                .ConfigureAwait(false);
            var openTicketId = linkedTickets
                .Where(t => TicketStatusTransitions.IsOpen(t.Status))
                .OrderByDescending(t => t.ReportedAt)
                .Select(t => (Guid?)t.Id.Value)
                .FirstOrDefault();

            // Map to DTO
            var dto = new InspectionDto(
                Id: inspection.Id.Value,
                CheckpointId: inspection.CheckpointId.Value,
                CheckpointName: checkpoint?.Name ?? "UNKNOWN",
                // Denormalized checklist criteria from the checkpoint (portal MSW contract:
                // the detail screen renders inspection.criteria without a second fetch).
                Criteria: checkpoint?.Criteria.Select(c => new InspectionCriteriaDto(
                    Id: c.Id,
                    Type: c.Type,
                    Description: c.Description
                )).ToArray() ?? Array.Empty<InspectionCriteriaDto>(),
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
                CompletedAt: inspection.CompletedAt,
                ReworkOfInspectionId: inspection.ReworkOfInspectionId?.Value,
                OpenTicketId: openTicketId
            );

            return Result<InspectionDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<InspectionDto>.Error($"Failed to retrieve inspection: {ex.Message}");
        }
    }
}
