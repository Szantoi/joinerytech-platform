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

            // Map to DTO (shared mapper — list query and transition endpoints reuse it)
            return Result<TicketDto>.Success(TicketDtoMapper.ToDto(ticket));
        }
        catch (Exception ex)
        {
            return Result<TicketDto>.Error($"Failed to retrieve ticket: {ex.Message}");
        }
    }
}
