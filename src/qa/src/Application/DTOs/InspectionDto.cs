using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Full inspection details DTO.
/// Carries the checkpoint's inspection criteria denormalized (Criteria) so the
/// detail screen checklist needs no extra checkpoint fetch (portal MSW contract).
/// </summary>
public record InspectionDto(
    Guid Id,
    Guid CheckpointId,
    string CheckpointName,
    InspectionCriteriaDto[] Criteria,
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
