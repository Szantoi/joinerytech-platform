using MediatR;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.ScheduleSafetyWalk;

/// <summary>
/// Command to schedule a safety walk (FSM entry: Scheduled)
/// </summary>
public record ScheduleSafetyWalkCommand(
    Guid TenantId,
    Guid LocationId,
    DateTimeOffset ScheduledDate,
    Guid ConductedBy,
    List<Guid>? Participants
) : IRequest<Guid>;
