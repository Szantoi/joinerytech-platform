using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to reopen a rejected ticket (FSM: Rejected → Reported).
/// </summary>
public record ReopenTicketCommand(
    TicketId TicketId,
    Guid TenantId
) : IRequest<Result>;
