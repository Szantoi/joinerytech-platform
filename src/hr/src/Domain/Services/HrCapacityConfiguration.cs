using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.HR.Domain.Services;

/// <summary>
/// Capacity calculation thresholds — CONFIG-DRIVEN (QUALITY.md 3.), bound from the
/// "Hr:Capacity" configuration section by the API host; the defaults below are the
/// domain fallback. Mirrors the EHS RiskBandConfiguration precedent (value object,
/// fails fast on invalid configuration at startup).
///
/// The same three knobs exist on the portal side (services/hr/config.ts:
/// WORKDAYS_PER_WEEK / OVERLOAD_EPSILON / UTILIZATION_WARN_THRESHOLD) — this record
/// is their server-side source of truth.
/// </summary>
public record HrCapacityConfiguration
{
    /// <summary>Workdays per week — daily capacity = weekly hours / this.</summary>
    public int WorkdaysPerWeek { get; }

    /// <summary>Rounding tolerance for the overload flag (8.0 h booked on 8 h capacity is not an overload).</summary>
    public decimal OverloadEpsilon { get; }

    /// <summary>Utilization ratio above which a week counts as "high load" (warn).</summary>
    public decimal UtilizationWarnThreshold { get; }

    /// <summary>Domain defaults — the portal config.ts mirror (5 / 0.01 / 0.85).</summary>
    public static HrCapacityConfiguration Default { get; } = new(5, 0.01m, 0.85m);

    public HrCapacityConfiguration(int workdaysPerWeek, decimal overloadEpsilon, decimal utilizationWarnThreshold)
    {
        if (workdaysPerWeek is < 1 or > 7)
            throw new DomainException("Hr:Capacity:WorkdaysPerWeek must be between 1 and 7");
        if (overloadEpsilon < 0)
            throw new DomainException("Hr:Capacity:OverloadEpsilon must be non-negative");
        if (utilizationWarnThreshold is < 0 or > 1)
            throw new DomainException("Hr:Capacity:UtilizationWarnThreshold must be between 0 and 1");

        WorkdaysPerWeek = workdaysPerWeek;
        OverloadEpsilon = overloadEpsilon;
        UtilizationWarnThreshold = utilizationWarnThreshold;
    }
}
