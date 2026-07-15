using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

/// <summary>
/// Config-driven band boundaries of the 5×5 risk matrix — NO hardcoded thresholds
/// in the aggregate. The bands are contiguous and cover the whole 1-25 score range:
///
///   Low:      1 .. LowMax
///   Medium:   LowMax+1 .. MediumMax
///   High:     MediumMax+1 .. HighMax
///   Critical: HighMax+1 .. 25
///
/// The API host binds this from configuration (section "Ehs:RiskMatrix:Bands");
/// when the section is missing, <see cref="Default"/> applies (4 / 9 / 16).
/// Immutable value object — an invalid configuration fails fast in the constructor.
/// </summary>
public sealed record RiskBandConfiguration
{
    /// <summary>Lowest possible score (1×1)</summary>
    public const int MinScore = 1;

    /// <summary>Highest possible score (5×5)</summary>
    public const int MaxScore = 25;

    /// <summary>Inclusive upper bound of the Low band</summary>
    public int LowMax { get; }

    /// <summary>Inclusive upper bound of the Medium band</summary>
    public int MediumMax { get; }

    /// <summary>Inclusive upper bound of the High band (Critical starts above)</summary>
    public int HighMax { get; }

    public RiskBandConfiguration(int lowMax, int mediumMax, int highMax)
    {
        if (lowMax < MinScore)
            throw new ArgumentException($"LowMax must be at least {MinScore}", nameof(lowMax));

        if (mediumMax <= lowMax)
            throw new ArgumentException("MediumMax must be greater than LowMax", nameof(mediumMax));

        if (highMax <= mediumMax)
            throw new ArgumentException("HighMax must be greater than MediumMax", nameof(highMax));

        if (highMax >= MaxScore)
            throw new ArgumentException(
                $"HighMax must be below {MaxScore} so the Critical band is non-empty", nameof(highMax));

        LowMax = lowMax;
        MediumMax = mediumMax;
        HighMax = highMax;
    }

    /// <summary>
    /// Default bands (ISO 45001-style): Low 1-4, Medium 5-9, High 10-16, Critical 17-25.
    /// Used when no configuration override is provided.
    /// </summary>
    public static RiskBandConfiguration Default { get; } = new(4, 9, 16);

    /// <summary>
    /// Classify a risk score (Severity × Likelihood) into a band.
    /// </summary>
    public RiskLevel LevelFor(int riskScore)
    {
        if (riskScore is < MinScore or > MaxScore)
            throw new ArgumentOutOfRangeException(
                nameof(riskScore), $"RiskScore must be {MinScore}-{MaxScore}");

        if (riskScore <= LowMax) return RiskLevel.Low;
        if (riskScore <= MediumMax) return RiskLevel.Medium;
        if (riskScore <= HighMax) return RiskLevel.High;
        return RiskLevel.Critical;
    }
}
