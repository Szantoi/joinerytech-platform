using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.FSM;

/// <summary>
/// Default win probability per opportunity stage (percent, 0–100) — the domain's
/// stage policy, applied by the aggregate on every main-chain transition so the
/// thresholds never appear as literals in the transition methods (QUALITY.md 3.).
///
/// Mirrors the portal OPP_STAGE_PROBABILITY (<c>modules/crm/services/fsm.ts</c>),
/// which stores the same table as fractions:
///
///   Open (nyitott)                    10%
///   NeedsAssessment (igenyfelmeres)   25%
///   SolutionAssembly (osszeallitas)   40%
///   Proposal (ajanlat)                55%
///   Negotiation (targyalas)           80%
///   Won (megnyert)                   100%
///   Lost / Abandoned (elveszett)       0%
///
/// A deployment may override the *forecast weighting* through
/// <c>Crm:Forecast:StageProbability:*</c> (defaults bound from this table); the
/// per-deal <see cref="Aggregates.Opportunity.Probability"/> may also be adjusted
/// manually via UpdateEstimate. See CRM-BE-HOST follow-up #3.
/// </summary>
public static class OpportunityStageProbability
{
    private static readonly IReadOnlyDictionary<OpportunityStatus, decimal> Table =
        new Dictionary<OpportunityStatus, decimal>
        {
            [OpportunityStatus.Open] = 10m,
            [OpportunityStatus.NeedsAssessment] = 25m,
            [OpportunityStatus.SolutionAssembly] = 40m,
            [OpportunityStatus.Proposal] = 55m,
            [OpportunityStatus.Negotiation] = 80m,
            [OpportunityStatus.Won] = 100m,
            [OpportunityStatus.Lost] = 0m,
            [OpportunityStatus.Abandoned] = 0m
        };

    /// <summary>Default win probability (percent) for the given stage.</summary>
    public static decimal For(OpportunityStatus status)
        => Table.TryGetValue(status, out var probability) ? probability : 0m;

    /// <summary>All stage → probability pairs (config-binding defaults, forecast).</summary>
    public static IReadOnlyDictionary<OpportunityStatus, decimal> All => Table;
}
