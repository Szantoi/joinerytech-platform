using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Resolution action input DTO for command.
/// </summary>
public record ResolutionActionInput(
    ActionType ActionType,
    string Description,
    decimal? CostAmount = null
);

/// <summary>
/// Command to resolve a ticket with resolution actions (FSM: InProgress → Resolved).
/// </summary>
public record ResolveTicketCommand(
    TicketId TicketId,
    List<ResolutionActionInput> ResolutionActions,
    string? ResolutionNotes,
    Guid TenantId
) : IRequest<Result>;
