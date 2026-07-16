using SpaceOS.Modules.QA.Domain.Aggregates;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Single source for Ticket → TicketDto mapping (used by the detail query,
/// the list query and the transition endpoints returning the fresh DTO).
/// </summary>
public static class TicketDtoMapper
{
    public static TicketDto ToDto(Ticket ticket)
    {
        return new TicketDto(
            Id: ticket.Id.Value,
            TicketType: ticket.TicketType,
            Status: ticket.Status,
            Priority: ticket.Priority,
            OrderId: ticket.OrderId,
            ProductId: ticket.ProductId,
            InspectionId: ticket.InspectionId,
            Title: ticket.Title,
            Description: ticket.Description,
            ReportedBy: ticket.ReportedBy,
            AssignedTo: ticket.AssignedTo,
            ResolutionNotes: ticket.ResolutionNotes,
            ResolutionActions: ticket.ResolutionActions.Select(ra => new ResolutionActionDto(
                ActionType: ra.ActionType,
                Description: ra.Description,
                CostAmount: ra.Cost.Amount
            )).ToArray(),
            ReportedAt: ticket.ReportedAt,
            AssignedAt: ticket.AssignedAt,
            StartedAt: ticket.StartedAt,
            ResolvedAt: ticket.ResolvedAt
        );
    }
}
