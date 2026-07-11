using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Full inspection details DTO.
/// </summary>
public record InspectionDto(
    Guid Id,
    Guid CheckpointId,
    string CheckpointName,
    Guid? OrderId,
    Guid? ProductId,
    InspectionStatus Status,
    InspectionResult Result,
    Guid InspectorId,
    string? Notes,
    FailureNoteDto[] FailureNotes,
    DateTime PlannedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt
);
