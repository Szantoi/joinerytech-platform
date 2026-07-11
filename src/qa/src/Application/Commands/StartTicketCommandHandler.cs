using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for StartTicketCommand.
/// </summary>
public class StartTicketCommandHandler : IRequestHandler<StartTicketCommand, Result>
{
    private readonly ITicketRepository _ticketRepository;

    public StartTicketCommandHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result> Handle(StartTicketCommand request, CancellationToken ct)
    {
        try
        {
            // Get the ticket
            var ticket = await _ticketRepository
                .GetByIdAsync(request.TicketId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (ticket == null)
                return Result.NotFound("Ticket not found");

            // Start the ticket
            ticket.Start();

            // Save changes
            await _ticketRepository.UpdateAsync(ticket, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to start ticket: {ex.Message}");
        }
    }
}
