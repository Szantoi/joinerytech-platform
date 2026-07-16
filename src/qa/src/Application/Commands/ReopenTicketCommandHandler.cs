using Ardalis.Result;
using SpaceOS.Kernel.Domain.Exceptions;
using MediatR;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for ReopenTicketCommand.
/// </summary>
public class ReopenTicketCommandHandler : IRequestHandler<ReopenTicketCommand, Result>
{
    private readonly ITicketRepository _ticketRepository;

    public ReopenTicketCommandHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result> Handle(ReopenTicketCommand request, CancellationToken ct)
    {
        try
        {
            // Get the ticket
            var ticket = await _ticketRepository
                .GetByIdAsync(request.TicketId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (ticket == null)
                return Result.NotFound("Ticket not found");

            // Reopen the ticket
            ticket.Reopen();

            // Save changes
            await _ticketRepository.UpdateAsync(ticket, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (InvalidStatusTransitionException ex)
        {
            // Illegal FSM transition / status-guarded action -> HTTP 409 at the endpoint
            return Result.Conflict(ex.Message);
        }
        catch (DomainException ex)
        {
            // Aggregate payload validation -> HTTP 400 at the endpoint
            return Result.Invalid(new ValidationError(ex.Message));
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to reopen ticket: {ex.Message}");
        }
    }
}
