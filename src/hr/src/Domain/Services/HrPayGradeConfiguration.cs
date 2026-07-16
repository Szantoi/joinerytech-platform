using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Domain.Services;

/// <summary>
/// Hourly rates per pay grade band — CONFIG-DRIVEN tenant business data (ADR-060: the
/// band is a taxonomy key, the rate is NOT baked into the enum). Bound from the
/// "Hr:PayGrades" configuration section (keys = band names: Helper / SkilledWorker /
/// Master / Engineer / Lead); the defaults below are the domain fallback, mirroring the
/// portal seed (mocks/hr.ts HR_PAY_GRADE_META rates). Mirrors the HrCapacityConfiguration
/// / EHS RiskBandConfiguration precedent: value object, fails fast on invalid values.
/// </summary>
public record HrPayGradeConfiguration
{
    private readonly IReadOnlyDictionary<PayGradeBand, decimal> _rates;

    /// <summary>Domain defaults — the portal HR_PAY_GRADE_META mirror (Ft/hour).</summary>
    public static HrPayGradeConfiguration Default { get; } =
        new(helper: 2600m, skilledWorker: 3800m, master: 5200m, engineer: 6400m, lead: 8000m);

    public HrPayGradeConfiguration(
        decimal helper,
        decimal skilledWorker,
        decimal master,
        decimal engineer,
        decimal lead)
    {
        _rates = new Dictionary<PayGradeBand, decimal>
        {
            [PayGradeBand.Helper] = Validate(helper, "Helper"),
            [PayGradeBand.SkilledWorker] = Validate(skilledWorker, "SkilledWorker"),
            [PayGradeBand.Master] = Validate(master, "Master"),
            [PayGradeBand.Engineer] = Validate(engineer, "Engineer"),
            [PayGradeBand.Lead] = Validate(lead, "Lead")
        };
    }

    /// <summary>The tenant's hourly rate for the given band.</summary>
    public decimal RateFor(PayGradeBand band)
        => _rates.TryGetValue(band, out var rate)
            ? rate
            : throw new DomainException($"No hourly rate configured for pay grade band '{band}'");

    private static decimal Validate(decimal rate, string band)
        => rate > 0
            ? rate
            : throw new DomainException($"Hr:PayGrades:{band} must be a positive hourly rate");
}
