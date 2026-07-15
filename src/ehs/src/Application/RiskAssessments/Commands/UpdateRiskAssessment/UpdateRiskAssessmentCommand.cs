using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.UpdateRiskAssessment;

/// <summary>
/// Update the assessment details (Draft only — otherwise 409).
/// Score and band are recalculated from the new ratings.
/// </summary>
public record UpdateRiskAssessmentCommand(
    Guid RiskAssessmentId,
    Guid TenantId,
    string HazardDescription,
    Severity Severity,
    Likelihood Likelihood,
    DateTimeOffset ReviewDueDate,
    Guid? LocationId
) : IRequest<Unit>;
