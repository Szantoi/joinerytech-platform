using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to complete an inspection with Conditional result (FSM: InProgress → Completed) — ADR-063.
/// "Passed with minor defects": the documented defects (min. 1 failure note) feed the
/// automatically spawned rework Ticket (linked via InspectionId). The repair loop then
/// runs in the Ticket FSM; the re-check is a new Inspection (CreateReworkInspectionCommand).
/// Returns the spawned rework ticket's id.
/// </summary>
public record CompleteInspectionWithConditionalCommand(
    InspectionId InspectionId,
    List<FailureNoteInput> FailureNotes,
    string? Notes,
    CrmTaskPriority ReworkTicketPriority,
    Guid TenantId
) : IRequest<Result<Guid>>;
