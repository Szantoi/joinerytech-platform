using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CreateTicketCommand.
/// </summary>
public class CreateTicketCommandHandler : IRequestHandler<CreateTicketCommand, Result<TicketId>>
{
    private readonly ITicketRepository _ticketRepository;

    public CreateTicketCommandHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result<TicketId>> Handle(CreateTicketCommand request, CancellationToken ct)
    {
        try
        {
            // Create the ticket
            var ticket = Ticket.Create(
                request.TenantId,
                request.TicketType,
                request.Priority,
                request.Title,
                request.Description,
                request.ReportedBy,
                request.OrderId,
                request.ProductId,
                request.InspectionId);

            // Save to repository
            await _ticketRepository.AddAsync(ticket, ct).ConfigureAwait(false);

            return Result<TicketId>.Success(ticket.Id);
        }
        catch (Exception ex)
        {
            return Result<TicketId>.Error($"Failed to create ticket: {ex.Message}");
        }
    }
}
