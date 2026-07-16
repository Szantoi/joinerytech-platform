namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Configuration-driven thresholds of the portfolio read model
/// (EHS <c>RiskBandConfiguration</c> precedent: bound from configuration at
/// startup, invalid values fail fast in the constructor).
/// </summary>
/// <remarks>
/// <para>
/// Configuration section <c>Kontrolling:Portfolio</c>:
/// <list type="bullet">
///   <item><c>AtRiskMarginThreshold</c> — a running project whose EAC margin
///   falls below this is reported as at risk (default 0.15 = 15%).</item>
///   <item><c>AtRiskStatuses</c> — the lifecycle labels that count as running
///   (default: Active, Install, OnHold — Draft and Done are never at risk).</item>
/// </list>
/// </para>
/// <para>
/// Margins are FRACTIONS (0.15 = 15%), matching the wire contract.
/// </para>
/// <para>
/// The weak/medium/good margin BANDS deliberately live on the client
/// (portal services/config.ts): this API emits the raw margin fraction, and
/// banding is a presentation concern. Only the at-risk threshold changes the
/// response payload, so only it is server-side configuration.
/// </para>
/// </remarks>
public sealed class PortfolioThresholds
{
    /// <summary>Configuration section this is bound from.</summary>
    public const string SectionName = "Kontrolling:Portfolio";

    /// <summary>Defaults — mirror the portal's config.ts constants.</summary>
    public static PortfolioThresholds Default { get; } = new(
        atRiskMarginThreshold: 0.15m,
        atRiskStatuses: new[]
        {
            ProjectLifecycleStatus.Active,
            ProjectLifecycleStatus.Install,
            ProjectLifecycleStatus.OnHold
        });

    /// <summary>EAC-margin fraction below which a running project is at risk.</summary>
    public decimal AtRiskMarginThreshold { get; }

    /// <summary>Lifecycle labels that count as "running" for the at-risk KPI.</summary>
    public IReadOnlySet<ProjectLifecycleStatus> AtRiskStatuses { get; }

    /// <exception cref="ArgumentOutOfRangeException">
    /// The threshold is not a fraction below 1 (a margin of 100% is unreachable,
    /// so such a threshold would flag every project — almost certainly a
    /// percent-vs-fraction configuration mistake).
    /// </exception>
    /// <exception cref="ArgumentException">The at-risk status set is empty.</exception>
    public PortfolioThresholds(
        decimal atRiskMarginThreshold,
        IEnumerable<ProjectLifecycleStatus> atRiskStatuses)
    {
        if (atRiskMarginThreshold >= 1m)
        {
            throw new ArgumentOutOfRangeException(
                nameof(atRiskMarginThreshold),
                atRiskMarginThreshold,
                $"{SectionName}:AtRiskMarginThreshold must be a fraction below 1 " +
                "(0.15 = 15%), not a percentage.");
        }

        var statuses = atRiskStatuses?.ToHashSet()
            ?? throw new ArgumentNullException(nameof(atRiskStatuses));

        if (statuses.Count == 0)
        {
            throw new ArgumentException(
                $"{SectionName}:AtRiskStatuses must name at least one lifecycle label.",
                nameof(atRiskStatuses));
        }

        AtRiskMarginThreshold = atRiskMarginThreshold;
        AtRiskStatuses = statuses;
    }

    /// <summary>
    /// True when the project is running and its EAC margin is below the
    /// configured threshold. An unknown margin (no contract value) is never
    /// at risk — there is nothing to measure against.
    /// </summary>
    public bool IsAtRisk(ProjectLifecycleStatus status, decimal? eacMarginPct) =>
        AtRiskStatuses.Contains(status)
        && eacMarginPct is not null
        && eacMarginPct < AtRiskMarginThreshold;
}
