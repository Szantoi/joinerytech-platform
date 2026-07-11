using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetResolvedTicketsQuery.
/// CRITICAL: Used for root cause analysis (Pareto 80/20) to identify recurring issues.
/// </summary>
public class GetResolvedTicketsQueryHandler : IRequestHandler<GetResolvedTicketsQuery, Result<TicketListDto[]>>
{
    private readonly ITicketRepository _ticketRepository;

    public GetResolvedTicketsQueryHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result<TicketListDto[]>> Handle(GetResolvedTicketsQuery request, CancellationToken ct)
    {
        try
        {
            // Get resolved tickets in date range
            var tickets = await _ticketRepository
                .GetResolvedTicketsAsync(request.TenantId, request.FromDate, request.ToDate, ct)
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
            return Result<TicketListDto[]>.Error($"Failed to retrieve resolved tickets: {ex.Message}");
        }
    }
}
