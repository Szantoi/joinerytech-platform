using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;

public record AddControlMeasureCommand(
    Guid RiskAssessmentId,
    Guid TenantId,
    string ControlMeasure,
    string ResponsiblePerson
) : IRequest<Unit>;
