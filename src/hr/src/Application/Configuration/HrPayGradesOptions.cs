using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.Configuration;

/// <summary>
/// Binding POCO for the "Hr:PayGrades" configuration section — hourly rate (Ft/hour)
/// per pay grade band (ADR-060: the band is a taxonomy key, the rate is tenant business
/// data read from configuration, options pattern).
///
/// The property initializers are the domain defaults (portal HR_PAY_GRADE_META mirror),
/// so an unbound/missing section degrades to the defaults instead of failing; invalid
/// values (≤ 0) fail fast in <see cref="ToConfiguration"/> — first handler resolution.
///
/// Host wiring (owned by the hosting task, documented in ADR-IMPL-HR-TAX.md):
///   services.Configure&lt;HrPayGradesOptions&gt;(configuration.GetSection(SectionName));
/// </summary>
public class HrPayGradesOptions
{
    public const string SectionName = "Hr:PayGrades";

    /// <summary>Segéd / betanított (wire: seged).</summary>
    public decimal Helper { get; set; } = 2600m;

    /// <summary>Szakmunkás (wire: szakmunkas).</summary>
    public decimal SkilledWorker { get; set; } = 3800m;

    /// <summary>Mester / előmunkás (wire: mester).</summary>
    public decimal Master { get; set; } = 5200m;

    /// <summary>Mérnök / tervező (wire: mernok).</summary>
    public decimal Engineer { get; set; } = 6400m;

    /// <summary>Vezető (wire: vezeto).</summary>
    public decimal Lead { get; set; } = 8000m;

    /// <summary>Converts to the validated domain value object (throws DomainException on invalid rates).</summary>
    public HrPayGradeConfiguration ToConfiguration()
        => new(Helper, SkilledWorker, Master, Engineer, Lead);
}
