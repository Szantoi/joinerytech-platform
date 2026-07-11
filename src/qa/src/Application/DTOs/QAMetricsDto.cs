namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// QA metrics DTO for pass/fail rates and resolution time analysis.
/// </summary>
public record QAMetricsDto
{
    /// <summary>
    /// Total number of inspections in the date range.
    /// </summary>
    public int TotalInspections { get; init; }

    /// <summary>
    /// Number of passed inspections (Completed with Pass result).
    /// </summary>
    public int PassedInspections { get; init; }

    /// <summary>
    /// Number of failed inspections (Completed with Fail result).
    /// </summary>
    public int FailedInspections { get; init; }

    /// <summary>
    /// Pass rate as a decimal (0.0 to 1.0).
    /// Calculation: PassedInspections / TotalInspections (0 if no inspections).
    /// </summary>
    public decimal PassRate { get; init; }

    /// <summary>
    /// Total number of tickets in the date range.
    /// </summary>
    public int TotalTickets { get; init; }

    /// <summary>
    /// Number of open tickets (not in Closed status).
    /// </summary>
    public int OpenTickets { get; init; }

    /// <summary>
    /// Average resolution time in hours.
    /// Calculation: Average of (ResolvedAt - CreatedAt) for resolved tickets.
    /// Null if no resolved tickets in the date range.
    /// </summary>
    public double? AverageResolutionTime { get; init; }
}
