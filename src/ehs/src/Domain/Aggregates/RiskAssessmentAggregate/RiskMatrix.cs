using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

/// <summary>
/// One cell of the 5×5 risk matrix summary: how many assessments sit at the
/// given Severity × Likelihood coordinate, and which band the cell belongs to.
/// </summary>
public sealed record RiskMatrixCell(
    Severity Severity,
    Likelihood Likelihood,
    int Count,
    RiskLevel RiskLevel
);

/// <summary>
/// Pure 5×5 matrix aggregation — domain logic, so it is unit-testable without
/// any persistence. The repository/query layer feeds it the (Severity, Likelihood)
/// pairs and maps the result to DTOs.
/// </summary>
public static class RiskMatrix
{
    /// <summary>
    /// Materialize all 25 cells (5 Severity × 5 Likelihood) with per-cell counts —
    /// empty cells are included with Count = 0 so the dashboard can render the full grid.
    /// Cell band classification uses the config-driven band boundaries.
    /// </summary>
    public static IReadOnlyList<RiskMatrixCell> BuildCells(
        IEnumerable<(Severity Severity, Likelihood Likelihood)> assessments,
        RiskBandConfiguration bands)
    {
        ArgumentNullException.ThrowIfNull(assessments);
        ArgumentNullException.ThrowIfNull(bands);

        var counts = assessments
            .GroupBy(a => (a.Severity, a.Likelihood))
            .ToDictionary(g => g.Key, g => g.Count());

        var cells = new List<RiskMatrixCell>(capacity: 25);

        foreach (var severity in Enum.GetValues<Severity>())
        {
            foreach (var likelihood in Enum.GetValues<Likelihood>())
            {
                var score = (int)severity * (int)likelihood;
                counts.TryGetValue((severity, likelihood), out var count);

                cells.Add(new RiskMatrixCell(severity, likelihood, count, bands.LevelFor(score)));
            }
        }

        return cells;
    }
}
