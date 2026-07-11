using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to escalate ticket priority (domain business rule based on age).
/// </summary>
public record EscalateTicketPriorityCommand(
    TicketId TicketId,
    CrmTaskPriority NewPriority,
    Guid TenantId
) : IRequest<Result>;
