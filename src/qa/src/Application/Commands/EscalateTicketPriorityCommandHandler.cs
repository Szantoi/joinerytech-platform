using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for EscalateTicketPriorityCommand.
/// </summary>
public class EscalateTicketPriorityCommandHandler : IRequestHandler<EscalateTicketPriorityCommand, Result>
{
    private readonly ITicketRepository _ticketRepository;

    public EscalateTicketPriorityCommandHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result> Handle(EscalateTicketPriorityCommand request, CancellationToken ct)
    {
        try
        {
            // Get the ticket
            var ticket = await _ticketRepository
                .GetByIdAsync(request.TicketId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (ticket == null)
                return Result.NotFound("Ticket not found");

            // Escalate priority
            ticket.EscalatePriority(request.NewPriority);

            // Save changes
            await _ticketRepository.UpdateAsync(ticket, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to escalate ticket priority: {ex.Message}");
        }
    }
}
