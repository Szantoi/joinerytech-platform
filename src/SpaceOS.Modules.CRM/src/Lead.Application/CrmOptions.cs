using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.FSM;

namespace SpaceOS.Modules.CRM.Application;

/// <summary>
/// Configurable CRM thresholds (QUALITY.md 3.: a threshold is never a literal).
/// Bound from the <c>Crm</c> configuration section; every value has a default
/// that mirrors the portal <c>modules/crm/services/config.ts</c> / <c>fsm.ts</c>.
/// </summary>
public sealed class CrmOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Crm";

    public CrmTaskOptions Tasks { get; set; } = new();

    public CrmForecastOptions Forecast { get; set; } = new();

    public CrmActivityOptions Activities { get; set; } = new();
}

/// <summary>Task SLA settings — <c>Crm:Tasks:*</c>.</summary>
public sealed class CrmTaskOptions
{
    /// <summary>
    /// SLA warning window in days: a task due within this many days reports
    /// <c>Soon</c>; a task past its due date reports <c>Overdue</c>.
    /// Mirrors the portal TASK_SLA_SOON_DAYS (default 2).
    /// </summary>
    public int SlaSoonDays { get; set; } = 2;
}

/// <summary>Weighted-forecast settings — <c>Crm:Forecast:*</c>.</summary>
public sealed class CrmForecastOptions
{
    /// <summary>
    /// Win probability per stage (percent, 0–100) used to weight the pipeline
    /// forecast. Defaults to the domain policy table
    /// (<see cref="OpportunityStageProbability"/>), which mirrors the portal
    /// OPP_STAGE_PROBABILITY; a deployment may override single stages via
    /// <c>Crm:Forecast:StageProbability:&lt;Stage&gt;</c>.
    /// </summary>
    public Dictionary<OpportunityStatus, decimal> StageProbability { get; set; } =
        OpportunityStageProbability.All.ToDictionary(kv => kv.Key, kv => kv.Value);

    /// <summary>
    /// Probability (percent) for a stage, falling back to the domain policy table
    /// when the configuration omits it.
    /// </summary>
    public decimal ProbabilityFor(OpportunityStatus status)
        => StageProbability.TryGetValue(status, out var value)
            ? value
            : OpportunityStageProbability.For(status);
}

/// <summary>Activity feed settings — <c>Crm:Activities:*</c>.</summary>
public sealed class CrmActivityOptions
{
    /// <summary>
    /// Default page size of the cross-entity "recent activities" feed.
    /// Mirrors the portal RECENT_ACTIVITY_LIMIT (default 8).
    /// </summary>
    public int RecentLimit { get; set; } = 8;
}
