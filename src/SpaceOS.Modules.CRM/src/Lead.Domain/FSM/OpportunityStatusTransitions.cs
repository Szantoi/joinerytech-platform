using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.FSM;

/// <summary>
/// Opportunity FSM transition table — the single source of truth for the
/// Opportunity aggregate's allowed status changes (QA <c>TicketStatusTransitions</c>
/// precedent).
///
/// Mirrors the portal contract (<c>modules/crm/services/fsm.ts</c> — OPP_FSM):
///
///   action           from                to               wire (hu)
///   ──────────────   ─────────────────   ──────────────   ────────────────────────────
///   startDiscovery   Open                NeedsAssessment  nyitott → igenyfelmeres
///   startProposal    NeedsAssessment     SolutionAssembly igenyfelmeres → osszeallitas
///   sendQuote        SolutionAssembly    Proposal         osszeallitas → ajanlat
///   negotiate        Proposal            Negotiation      ajanlat → targyalas
///   win              Negotiation         Won              targyalas → megnyert
///   lose             any open stage      Lost             bármely nyitott → elveszett
///
/// Winning requires walking the full main chain (only from <c>Negotiation</c>);
/// losing is allowed from any open stage.
///
/// <c>Abandoned</c> has no portal counterpart — it stays a backend-only terminal
/// state reachable from any open stage (see CRM-BE-HOST follow-up #4).
/// </summary>
public static class OpportunityStatusTransitions
{
    /// <summary>Open (non-terminal) stages in main-chain order — the portal OPP_OPEN_STAGES mirror.</summary>
    public static readonly IReadOnlyList<OpportunityStatus> OpenStages =
    [
        OpportunityStatus.Open,
        OpportunityStatus.NeedsAssessment,
        OpportunityStatus.SolutionAssembly,
        OpportunityStatus.Proposal,
        OpportunityStatus.Negotiation
    ];

    /// <summary>Main-chain (non-terminal → non-terminal) steps, in order.</summary>
    private static readonly HashSet<(OpportunityStatus From, OpportunityStatus To)> MainChain =
    [
        (OpportunityStatus.Open, OpportunityStatus.NeedsAssessment),
        (OpportunityStatus.NeedsAssessment, OpportunityStatus.SolutionAssembly),
        (OpportunityStatus.SolutionAssembly, OpportunityStatus.Proposal),
        (OpportunityStatus.Proposal, OpportunityStatus.Negotiation),
        (OpportunityStatus.Negotiation, OpportunityStatus.Won)
    ];

    /// <summary>True if the opportunity is in an open (non-terminal) stage.</summary>
    public static bool IsOpen(OpportunityStatus status) => OpenStages.Contains(status);

    /// <summary>True if <paramref name="from"/> → <paramref name="to"/> is a legal transition.</summary>
    public static bool CanTransition(OpportunityStatus from, OpportunityStatus to)
    {
        // Lost / Abandoned are reachable from any open stage; everything else
        // must follow the main chain.
        if (to is OpportunityStatus.Lost or OpportunityStatus.Abandoned)
        {
            return IsOpen(from);
        }

        return MainChain.Contains((from, to));
    }
}
