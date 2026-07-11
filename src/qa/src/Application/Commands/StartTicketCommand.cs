using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to start work on a ticket (FSM: Assigned → InProgress).
/// </summary>
public record StartTicketCommand(
    TicketId TicketId,
    Guid TenantId
) : IRequest<Result>;
