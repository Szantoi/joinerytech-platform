using MediatR;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.StartSafetyWalk;

/// <summary>
/// Command for FSM transition Scheduled → InProgress
/// </summary>
public record StartSafetyWalkCommand(
    Guid SafetyWalkId,
    Guid TenantId
) : IRequest<Unit>;
