using MediatR;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.Commands.CompleteCorrectiveAction;

/// <summary>
/// Command to complete a corrective action on the UNIFIED CAPA board
/// (works for incident-, safety-walk- and risk-assessment-sourced actions)
/// </summary>
public record CompleteCorrectiveActionCommand(
    Guid CorrectiveActionId,
    Guid TenantId
) : IRequest<Unit>;
