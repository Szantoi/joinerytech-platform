using System;

namespace JoineryTech.CRM.Domain.ValueObjects;

/// <summary>
/// LeadScore Value Object - Calculated lead qualification score (0-100).
/// </summary>
/// <remarks>
/// Score is computed by LeadScoringService based on:
/// - Source (Website=30, Referral=25, Exhibition=20, ColdCall=10)
/// - Activity count (≥5=30, ≥3=20, ≥1=10, 0=0)
/// - Estimated value (≥10M=20, ≥5M=15, ≥1M=10, <1M=5)
/// - Recency (≤7d=20, ≤30d=15, ≤90d=10, >90d=5)
///
/// Total max score: 100
/// </remarks>
public readonly record struct LeadScore
{
    public int Value { get; }
    public string Band { get; }

    private LeadScore(int value)
    {
        if (value < 0 || value > 100)
            throw new DomainException("Lead score must be between 0 and 100");

        Value = value;
        Band = value switch
        {
            >= 80 => "Hot",
            >= 60 => "Warm",
            >= 40 => "Moderate",
            >= 20 => "Cold",
            _ => "Very Cold"
        };
    }

    public static LeadScore From(int value) => new(value);

    /// <summary>
    /// Initial score for new leads (50 = moderate).
    /// </summary>
    public static LeadScore Initial() => new(50);

    /// <summary>
    /// Returns true if score indicates lead is "hot" (≥80).
    /// </summary>
    public bool IsHot => Value >= 80;

    /// <summary>
    /// Returns true if score indicates lead is "warm" or better (≥60).
    /// </summary>
    public bool IsWarmOrBetter => Value >= 60;
}
