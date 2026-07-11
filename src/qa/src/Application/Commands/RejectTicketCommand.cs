using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to reject a ticket (FSM: InProgress → Rejected).
/// </summary>
public record RejectTicketCommand(
    TicketId TicketId,
    string Reason,
    Guid TenantId
) : IRequest<Result>;
