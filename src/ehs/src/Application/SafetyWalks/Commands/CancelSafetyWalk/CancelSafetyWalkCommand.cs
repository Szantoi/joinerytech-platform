using MediatR;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CancelSafetyWalk;

/// <summary>
/// Command for FSM transition Scheduled → Cancelled (elmaradt)
/// </summary>
public record CancelSafetyWalkCommand(
    Guid SafetyWalkId,
    Guid TenantId
) : IRequest<Unit>;
