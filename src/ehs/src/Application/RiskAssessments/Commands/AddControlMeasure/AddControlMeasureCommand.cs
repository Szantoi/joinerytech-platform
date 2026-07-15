using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;

/// <summary>
/// Add a control/mitigation measure to a risk assessment.
/// When the Capa* fields are provided, a CorrectiveAction is spawned through the
/// unified CAPA mechanism (Source = RiskAssessment) and linked to the control —
/// the same pattern safety walk findings use.
/// </summary>
public record AddControlMeasureCommand(
    Guid RiskAssessmentId,
    Guid TenantId,
    string ControlMeasure,
    string ResponsiblePerson,
    string? CapaDescription,
    Guid? CapaAssignedTo,
    DateTimeOffset? CapaDueDate
) : IRequest<AddControlMeasureResult>;

/// <summary>Created control id + the spawned unified CAPA id (when requested)</summary>
public record AddControlMeasureResult(
    Guid RiskControlId,
    Guid? CorrectiveActionId
);
