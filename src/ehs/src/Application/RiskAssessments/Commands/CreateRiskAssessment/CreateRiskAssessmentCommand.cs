using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;

/// <summary>
/// FSM entry: create a risk assessment in Draft.
/// LocationId is an optional reference to an EhsLocation (érintett terület).
/// </summary>
public record CreateRiskAssessmentCommand(
    Guid TenantId,
    string HazardDescription,
    Severity Severity,
    Likelihood Likelihood,
    Guid AssessedBy,
    DateTimeOffset ReviewDueDate,
    Guid? LocationId
) : IRequest<Guid>;
