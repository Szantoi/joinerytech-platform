using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetTicketQuery.
/// </summary>
public class GetTicketQueryHandler : IRequestHandler<GetTicketQuery, Result<TicketDto>>
{
    private readonly ITicketRepository _ticketRepository;

    public GetTicketQueryHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result<TicketDto>> Handle(GetTicketQuery request, CancellationToken ct)
    {
        try
        {
            // Get the ticket
            var ticket = await _ticketRepository
                .GetByIdAsync(request.TicketId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (ticket == null)
                return Result<TicketDto>.NotFound("Ticket not found");

            // Map to DTO
            var dto = new TicketDto(
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

            return Result<TicketDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<TicketDto>.Error($"Failed to retrieve ticket: {ex.Message}");
        }
    }
}
