using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to create a new quality issue ticket.
/// </summary>
public record CreateTicketCommand(
    TicketType TicketType,
    CrmTaskPriority Priority,
    string Title,
    string Description,
    Guid ReportedBy,
    Guid? OrderId,
    Guid? ProductId,
    Guid? InspectionId,
    Guid TenantId
) : IRequest<Result<TicketId>>;
