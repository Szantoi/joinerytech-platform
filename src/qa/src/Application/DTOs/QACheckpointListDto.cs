using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// QA checkpoint list item DTO (lightweight for lists).
/// </summary>
public record QACheckpointListDto(
    Guid Id,
    string Name,
    CheckpointType CheckpointType,
    CriticalLevel CriticalLevel,
    bool IsActive,
    int CriteriaCount,
    DateTime CreatedAt
);
