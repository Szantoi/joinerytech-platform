using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetTicketsByOrderQuery.
/// </summary>
public class GetTicketsByOrderQueryHandler : IRequestHandler<GetTicketsByOrderQuery, Result<TicketListDto[]>>
{
    private readonly ITicketRepository _ticketRepository;

    public GetTicketsByOrderQueryHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result<TicketListDto[]>> Handle(GetTicketsByOrderQuery request, CancellationToken ct)
    {
        try
        {
            // Get tickets by order
            var tickets = await _ticketRepository
                .GetByOrderIdAsync(request.OrderId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Map to list DTOs
            var dtos = tickets.Select(t => new TicketListDto(
                Id: t.Id.Value,
                TicketType: t.TicketType,
                Status: t.Status,
                Priority: t.Priority,
                Title: t.Title,
                ReportedBy: t.ReportedBy,
                AssignedTo: t.AssignedTo,
                ReportedAt: t.ReportedAt,
                ResolvedAt: t.ResolvedAt
            )).ToArray();

            return Result<TicketListDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<TicketListDto[]>.Error($"Failed to retrieve tickets by order: {ex.Message}");
        }
    }
}
