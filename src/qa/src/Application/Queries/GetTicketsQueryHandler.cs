using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.FSM;
using SpaceOS.Modules.QA.Infrastructure.Persistence;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetTicketsQuery.
/// Simple predicates (tenant, status, priority, inspection) run in SQL;
/// the open-only guard and free-text search run via the pure
/// <see cref="ApplyInMemoryFilters"/> helper (unit-testable without a database).
/// </summary>
public class GetTicketsQueryHandler : IRequestHandler<GetTicketsQuery, Result<TicketDto[]>>
{
    private readonly QADbContext _context;

    public GetTicketsQueryHandler(QADbContext context)
    {
        _context = context;
    }

    public async Task<Result<TicketDto[]>> Handle(GetTicketsQuery request, CancellationToken ct)
    {
        try
        {
            var query = _context.Tickets
                .AsNoTracking()
                .Where(t => t.TenantId == request.TenantId);

            if (request.Status.HasValue)
                query = query.Where(t => t.Status == request.Status.Value);
            if (request.Priority.HasValue)
                query = query.Where(t => t.Priority == request.Priority.Value);
            if (request.InspectionId.HasValue)
                query = query.Where(t => t.InspectionId == request.InspectionId.Value);

            var tickets = await query.ToListAsync(ct).ConfigureAwait(false);

            var dtos = ApplyInMemoryFilters(tickets, request.OpenOnly, request.SearchText)
                .Select(TicketDtoMapper.ToDto)
                .ToArray();

            return Result<TicketDto[]>.Success(dtos);
        }
        catch (Exception ex)
        {
            return Result<TicketDto[]>.Error($"Failed to list tickets: {ex.Message}");
        }
    }

    /// <summary>
    /// Pure filter/sort step (portal MSW contract): open-only via the domain
    /// FSM guard, case-insensitive free-text search on title and description,
    /// newest report first.
    /// </summary>
    public static IEnumerable<Ticket> ApplyInMemoryFilters(
        IEnumerable<Ticket> tickets,
        bool openOnly,
        string? searchText)
    {
        var rows = tickets;

        if (openOnly)
            rows = rows.Where(t => TicketStatusTransitions.IsOpen(t.Status));

        if (!string.IsNullOrWhiteSpace(searchText))
        {
            rows = rows.Where(t =>
                t.Title.Contains(searchText, StringComparison.OrdinalIgnoreCase) ||
                t.Description.Contains(searchText, StringComparison.OrdinalIgnoreCase));
        }

        return rows.OrderByDescending(t => t.ReportedAt);
    }
}
