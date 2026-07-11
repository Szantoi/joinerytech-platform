using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Infrastructure.Persistence;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Handler for GetQAMetricsQuery.
/// Calculates QA metrics: inspection pass/fail rates and ticket resolution time.
/// </summary>
public class GetQAMetricsQueryHandler : IRequestHandler<GetQAMetricsQuery, Result<QAMetricsDto>>
{
    private readonly QADbContext _context;

    public GetQAMetricsQueryHandler(QADbContext context)
    {
        _context = context;
    }

    public async Task<Result<QAMetricsDto>> Handle(GetQAMetricsQuery request, CancellationToken ct)
    {
        try
        {
            // Query inspections in date range
            var inspections = await _context.Inspections
                .AsNoTracking()
                .Where(i => i.TenantId == request.TenantId &&
                           i.CompletedAt != null &&
                           i.CompletedAt >= request.StartDate &&
                           i.CompletedAt <= request.EndDate)
                .ToListAsync(ct)
                .ConfigureAwait(false);

            var totalInspections = inspections.Count;
            var passedInspections = inspections.Count(i => i.Result == InspectionResult.Pass);
            var failedInspections = inspections.Count(i => i.Result == InspectionResult.Fail);
            var passRate = totalInspections > 0 ? (decimal)passedInspections / totalInspections : 0m;

            // Query tickets in date range
            var tickets = await _context.Tickets
                .AsNoTracking()
                .Where(t => t.TenantId == request.TenantId &&
                           t.ReportedAt >= request.StartDate &&
                           t.ReportedAt <= request.EndDate)
                .ToListAsync(ct)
                .ConfigureAwait(false);

            var totalTickets = tickets.Count;
            var openTickets = tickets.Count(t => t.Status != TicketStatus.Resolved && t.Status != TicketStatus.Rejected);

            // Calculate average resolution time (hours)
            var resolvedTickets = tickets.Where(t => t.ResolvedAt.HasValue).ToList();
            double? averageResolutionTime = null;

            if (resolvedTickets.Any())
            {
                var resolutionTimes = resolvedTickets
                    .Select(t => (t.ResolvedAt!.Value - t.ReportedAt).TotalHours)
                    .ToList();

                averageResolutionTime = resolutionTimes.Average();
            }

            var metrics = new QAMetricsDto
            {
                TotalInspections = totalInspections,
                PassedInspections = passedInspections,
                FailedInspections = failedInspections,
                PassRate = passRate,
                TotalTickets = totalTickets,
                OpenTickets = openTickets,
                AverageResolutionTime = averageResolutionTime
            };

            return Result<QAMetricsDto>.Success(metrics);
        }
        catch (Exception ex)
        {
            return Result<QAMetricsDto>.Error($"Failed to calculate QA metrics: {ex.Message}");
        }
    }
}
