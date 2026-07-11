using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Inspection list item DTO (lightweight for lists).
/// </summary>
public record InspectionListDto(
    Guid Id,
    Guid CheckpointId,
    string CheckpointName,
    InspectionStatus Status,
    InspectionResult Result,
    Guid InspectorId,
    DateTime PlannedAt,
    DateTime? CompletedAt
);
