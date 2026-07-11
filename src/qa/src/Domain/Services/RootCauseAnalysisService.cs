using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Domain.Services;

/// <summary>
/// Domain service for root cause analysis and Pareto analysis of failures.
/// Provides insights for quality improvement and preventive actions.
/// </summary>
public class RootCauseAnalysisService
{
    /// <summary>
    /// Performs Pareto analysis on inspection failures.
    /// Returns failure types sorted by frequency (80/20 rule).
    /// </summary>
    public IEnumerable<FailureAnalysisResult> AnalyzeRootCauses(
        IEnumerable<Inspection> inspections,
        DateTime fromDate,
        DateTime toDate)
    {
        if (inspections == null) throw new ArgumentNullException(nameof(inspections));

        // Filter failed inspections in date range
        var failedInspections = inspections
            .Where(i => i.Result == InspectionResult.Fail
                        && i.CompletedAt.HasValue
                        && i.CompletedAt.Value >= fromDate
                        && i.CompletedAt.Value <= toDate)
            .ToList();

        if (!failedInspections.Any())
            return Enumerable.Empty<FailureAnalysisResult>();

        // Extract all failure notes from inspections
        var allFailures = failedInspections
            .SelectMany(i => i.FailureNotes ?? Enumerable.Empty<FailureNote>())
            .ToList();

        if (!allFailures.Any())
            return Enumerable.Empty<FailureAnalysisResult>();

        // Group by failure type and count
        var failureGroups = allFailures
            .GroupBy(f => f.FailureType)
            .Select(g => new
            {
                FailureType = g.Key,
                Count = g.Count(),
                Percentage = (double)g.Count() / allFailures.Count * 100
            })
            .OrderByDescending(x => x.Count)
            .ToList();

        var totalCount = allFailures.Count;
        var cumulativePercentage = 0.0;

        return failureGroups.Select(g =>
        {
            cumulativePercentage += g.Percentage;
            return new FailureAnalysisResult(
                g.FailureType,
                g.Count,
                g.Percentage,
                cumulativePercentage
            );
        }).ToList();
    }

    /// <summary>
    /// Gets top N failure categories (Pareto 80/20 rule).
    /// Typically 20% of failure types cause 80% of issues.
    /// </summary>
    public IEnumerable<FailureAnalysisResult> GetTopFailureCategories(
        IEnumerable<Inspection> inspections,
        DateTime fromDate,
        DateTime toDate,
        int topN = 5)
    {
        return AnalyzeRootCauses(inspections, fromDate, toDate)
            .Take(topN)
            .ToList();
    }

    /// <summary>
    /// Analyzes ticket root causes for preventive action planning.
    /// Groups tickets by failure type and calculates resolution costs.
    /// </summary>
    public IEnumerable<TicketRootCauseAnalysis> AnalyzeTicketRootCauses(
        IEnumerable<Ticket> tickets,
        DateTime fromDate,
        DateTime toDate)
    {
        if (tickets == null) throw new ArgumentNullException(nameof(tickets));

        // Filter resolved tickets in date range
        var resolvedTickets = tickets
            .Where(t => t.Status == TicketStatus.Resolved
                        && t.ResolvedAt.HasValue
                        && t.ResolvedAt.Value >= fromDate
                        && t.ResolvedAt.Value <= toDate)
            .ToList();

        if (!resolvedTickets.Any())
            return Enumerable.Empty<TicketRootCauseAnalysis>();

        // Group by ticket type
        return resolvedTickets
            .GroupBy(t => t.TicketType)
            .Select(g =>
            {
                var totalCost = g.Sum(t => CalculateTicketCost(t));
                var avgResolutionTime = g.Average(t =>
                    (t.ResolvedAt!.Value - t.ReportedAt).TotalHours);

                return new TicketRootCauseAnalysis(
                    g.Key,
                    g.Count(),
                    totalCost,
                    avgResolutionTime
                );
            })
            .OrderByDescending(x => x.TotalCost)
            .ToList();
    }

    /// <summary>
    /// Calculates total cost of a ticket based on resolution actions.
    /// </summary>
    private decimal CalculateTicketCost(Ticket ticket)
    {
        if (ticket.ResolutionActions == null || !ticket.ResolutionActions.Any())
            return 0m;

        return ticket.ResolutionActions.Sum(a => a.Cost.Amount);
    }

    /// <summary>
    /// Identifies recurring failure patterns (same failure type on same checkpoint).
    /// </summary>
    public IEnumerable<RecurringFailurePattern> IdentifyRecurringPatterns(
        IEnumerable<Inspection> inspections,
        DateTime fromDate,
        DateTime toDate,
        int minimumOccurrences = 3)
    {
        if (inspections == null) throw new ArgumentNullException(nameof(inspections));

        var failedInspections = inspections
            .Where(i => i.Result == InspectionResult.Fail
                        && i.CompletedAt.HasValue
                        && i.CompletedAt.Value >= fromDate
                        && i.CompletedAt.Value <= toDate)
            .ToList();

        // Group by checkpoint and failure type
        var patterns = failedInspections
            .SelectMany(i => (i.FailureNotes ?? Enumerable.Empty<FailureNote>())
                .Select(f => new
                {
                    CheckpointId = i.CheckpointId,
                    FailureType = f.FailureType,
                    Inspection = i
                }))
            .GroupBy(x => new { x.CheckpointId, x.FailureType })
            .Where(g => g.Count() >= minimumOccurrences)
            .Select(g => new RecurringFailurePattern(
                g.Key.CheckpointId.Value,
                g.Key.FailureType,
                g.Count(),
                g.First().Inspection.CompletedAt!.Value,
                g.Last().Inspection.CompletedAt!.Value
            ))
            .OrderByDescending(p => p.Occurrences)
            .ToList();

        return patterns;
    }
}

/// <summary>
/// Result of Pareto analysis for a single failure type.
/// </summary>
public record FailureAnalysisResult(
    FailureType FailureType,
    int Count,
    double Percentage,
    double CumulativePercentage);

/// <summary>
/// Analysis result for ticket root causes.
/// </summary>
public record TicketRootCauseAnalysis(
    TicketType TicketType,
    int Count,
    decimal TotalCost,
    double AvgResolutionTimeHours);

/// <summary>
/// Represents a recurring failure pattern.
/// </summary>
public record RecurringFailurePattern(
    Guid CheckpointId,
    FailureType FailureType,
    int Occurrences,
    DateTime FirstOccurrence,
    DateTime LastOccurrence);
