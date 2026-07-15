using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ArchiveRiskAssessment;

/// <summary>FSM: Approved → Archived</summary>
public record ArchiveRiskAssessmentCommand(
    Guid RiskAssessmentId,
    Guid TenantId
) : IRequest<Unit>;
