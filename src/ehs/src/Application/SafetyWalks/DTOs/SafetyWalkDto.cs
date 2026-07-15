using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

/// <summary>Safety walk detail including findings</summary>
public record SafetyWalkDto(
    Guid SafetyWalkId,
    Guid TenantId,
    Guid LocationId,
    DateTimeOffset ScheduledDate,
    Guid ConductedBy,
    List<Guid> Participants,
    SafetyWalkStatus Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset? ClosedAt,
    DateTimeOffset? CancelledAt,
    List<SafetyWalkFindingDto> Findings
);

/// <summary>Finding recorded during the walk</summary>
public record SafetyWalkFindingDto(
    Guid FindingId,
    string Description,
    Severity Severity,
    string? PhotoS3Key,
    bool RequiresAction,
    Guid? CorrectiveActionId,
    Guid? LinkedRiskAssessmentId,
    DateTimeOffset RecordedAt
);

/// <summary>Compact list row for the safety walk table</summary>
public record SafetyWalkListItemDto(
    Guid SafetyWalkId,
    Guid LocationId,
    DateTimeOffset ScheduledDate,
    Guid ConductedBy,
    SafetyWalkStatus Status,
    int FindingCount
);
