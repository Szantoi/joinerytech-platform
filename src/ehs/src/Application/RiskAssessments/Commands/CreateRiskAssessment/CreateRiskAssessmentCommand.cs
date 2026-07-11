using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;

public record CreateRiskAssessmentCommand(
    Guid TenantId,
    string HazardDescription,
    Severity Severity,
    Likelihood Likelihood,
    Guid AssessedBy,
    DateTimeOffset ReviewDueDate
) : IRequest<Guid>;
