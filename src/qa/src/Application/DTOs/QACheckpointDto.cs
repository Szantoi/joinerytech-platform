using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Full QA checkpoint details DTO.
/// </summary>
public record QACheckpointDto(
    Guid Id,
    string Name,
    CheckpointType CheckpointType,
    CriticalLevel CriticalLevel,
    string? Description,
    bool IsActive,
    InspectionCriteriaDto[] Criteria,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
