using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CompleteSafetyWalk;

/// <summary>
/// Command for FSM transition InProgress → ActionRequired | Closed.
/// Returns the resulting status so the client knows whether CAPAs are pending.
/// </summary>
public record CompleteSafetyWalkCommand(
    Guid SafetyWalkId,
    Guid TenantId
) : IRequest<SafetyWalkStatus>;
