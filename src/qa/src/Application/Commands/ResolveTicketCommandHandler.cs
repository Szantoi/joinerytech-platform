using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for ResolveTicketCommand.
/// </summary>
public class ResolveTicketCommandHandler : IRequestHandler<ResolveTicketCommand, Result>
{
    private readonly ITicketRepository _ticketRepository;

    public ResolveTicketCommandHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result> Handle(ResolveTicketCommand request, CancellationToken ct)
    {
        try
        {
            // Get the ticket
            var ticket = await _ticketRepository
                .GetByIdAsync(request.TicketId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (ticket == null)
                return Result.NotFound("Ticket not found");

            // Convert ResolutionActionInput to ResolutionAction value objects
            var resolutionActions = request.ResolutionActions
                .Select(ra =>
                {
                    var cost = ra.CostAmount.HasValue
                        ? Money.Create(ra.CostAmount.Value, "HUF")
                        : Money.Zero("HUF");
                    return ResolutionAction.Create(ra.ActionType, ra.Description, cost);
                })
                .ToList();

            // Resolve the ticket
            ticket.Resolve(resolutionActions, request.ResolutionNotes);

            // Save changes
            await _ticketRepository.UpdateAsync(ticket, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to resolve ticket: {ex.Message}");
        }
    }
}
