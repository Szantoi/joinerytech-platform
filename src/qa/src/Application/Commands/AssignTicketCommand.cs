using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to assign a ticket to a user (FSM: Reported → Assigned).
/// </summary>
public record AssignTicketCommand(
    TicketId TicketId,
    Guid AssigneeId,
    Guid TenantId
) : IRequest<Result>;
