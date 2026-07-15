using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.AddSafetyWalkFinding;

/// <summary>
/// Command to record a finding during a safety walk.
/// When the finding requires action AND CAPA data is provided
/// (CapaAssignedTo + CapaDueDate), a corrective action is spawned through
/// the UNIFIED CAPA mechanism (same as incidents) and linked to the finding.
/// </summary>
public record AddSafetyWalkFindingCommand(
    Guid SafetyWalkId,
    Guid TenantId,
    string Description,
    Severity Severity,
    bool RequiresAction,
    string? PhotoS3Key,
    Guid? LinkedRiskAssessmentId,
    string? CapaDescription,
    Guid? CapaAssignedTo,
    DateTimeOffset? CapaDueDate
) : IRequest<AddSafetyWalkFindingResult>;

/// <summary>Result: the recorded finding and the optionally spawned CAPA</summary>
public record AddSafetyWalkFindingResult(
    Guid FindingId,
    Guid? CorrectiveActionId
);
