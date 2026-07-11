using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetTicketsByStatusQuery.
/// </summary>
public class GetTicketsByStatusQueryHandler : IRequestHandler<GetTicketsByStatusQuery, Result<TicketListDto[]>>
{
    private readonly ITicketRepository _ticketRepository;

    public GetTicketsByStatusQueryHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result<TicketListDto[]>> Handle(GetTicketsByStatusQuery request, CancellationToken ct)
    {
        try
        {
            // Get tickets by status
            var tickets = await _ticketRepository
                .GetByStatusAsync(request.Status, request.TenantId, ct)
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
            return Result<TicketListDto[]>.Error($"Failed to retrieve tickets by status: {ex.Message}");
        }
    }
}
