using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Failure note input DTO for command.
/// </summary>
public record FailureNoteInput(
    FailureType FailureType,
    string Description,
    string? PhotoUrl = null
);

/// <summary>
/// Command to complete an inspection with Fail result (FSM: InProgress → Completed).
/// CRITICAL: If checkpoint CriticalLevel == Critical, this blocks production!
/// </summary>
public record CompleteInspectionWithFailCommand(
    InspectionId InspectionId,
    List<FailureNoteInput> FailureNotes,
    string? Notes,
    Guid TenantId
) : IRequest<Result>;
