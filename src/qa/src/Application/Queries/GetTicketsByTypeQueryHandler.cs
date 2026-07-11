using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetTicketsByTypeQuery.
/// </summary>
public class GetTicketsByTypeQueryHandler : IRequestHandler<GetTicketsByTypeQuery, Result<TicketListDto[]>>
{
    private readonly ITicketRepository _ticketRepository;

    public GetTicketsByTypeQueryHandler(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<Result<TicketListDto[]>> Handle(GetTicketsByTypeQuery request, CancellationToken ct)
    {
        try
        {
            // Get tickets by type
            var tickets = await _ticketRepository
                .GetByTypeAsync(request.TicketType, request.TenantId, ct)
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
            return Result<TicketListDto[]>.Error($"Failed to retrieve tickets by type: {ex.Message}");
        }
    }
}
