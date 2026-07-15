using MediatR;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CloseSafetyWalk;

/// <summary>
/// Command for FSM transition ActionRequired → Closed
/// (guard: every linked corrective action must be completed)
/// </summary>
public record CloseSafetyWalkCommand(
    Guid SafetyWalkId,
    Guid TenantId
) : IRequest<Unit>;
