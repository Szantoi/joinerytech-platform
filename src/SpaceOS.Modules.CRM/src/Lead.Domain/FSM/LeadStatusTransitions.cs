using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.FSM;

/// <summary>
/// Lead FSM transition table — the single source of truth for the Lead aggregate's
/// allowed status changes (QA <c>TicketStatusTransitions</c> precedent).
///
/// Mirrors the portal contract (<c>modules/crm/services/fsm.ts</c> — LEAD_FSM):
///
///   action     from                                    to             wire (hu)
///   ────────   ─────────────────────────────────────   ────────────   ─────────────────────────────
///   contact    New                                     Contacted      uj → kapcsolat
///   qualify    Contacted                               Qualified      kapcsolat → minosites
///   nurture    Qualified                               Nurturing      minosites → nurturing
///   convert    Qualified, Nurturing                    Opportunity    minosites|nurturing → konvertalva
///   discard    New, Contacted, Qualified, Nurturing    Disqualified   bármely nyitott → elvetve
///
/// <c>Nurturing</c> is an optional parking state: a lead may be converted straight
/// from <c>Qualified</c> or after nurturing, and discarded from any open state.
/// </summary>
public static class LeadStatusTransitions
{
    /// <summary>Open (non-terminal) lead states — the portal LEAD_OPEN_STATUSES mirror.</summary>
    public static readonly IReadOnlyList<LeadStatus> OpenStatuses =
    [
        LeadStatus.New,
        LeadStatus.Contacted,
        LeadStatus.Qualified,
        LeadStatus.Nurturing
    ];

    /// <summary>Allowed (from → to) status pairs. Everything absent here is a conflict.</summary>
    private static readonly HashSet<(LeadStatus From, LeadStatus To)> Allowed =
    [
        (LeadStatus.New, LeadStatus.Contacted),
        (LeadStatus.Contacted, LeadStatus.Qualified),
        (LeadStatus.Qualified, LeadStatus.Nurturing),

        // convert — from Qualified directly, or after nurturing
        (LeadStatus.Qualified, LeadStatus.Opportunity),
        (LeadStatus.Nurturing, LeadStatus.Opportunity),

        // discard — from any open state
        (LeadStatus.New, LeadStatus.Disqualified),
        (LeadStatus.Contacted, LeadStatus.Disqualified),
        (LeadStatus.Qualified, LeadStatus.Disqualified),
        (LeadStatus.Nurturing, LeadStatus.Disqualified)
    ];

    /// <summary>True if the lead is in an open (non-terminal) state.</summary>
    public static bool IsOpen(LeadStatus status) => OpenStatuses.Contains(status);

    /// <summary>True if <paramref name="from"/> → <paramref name="to"/> is a legal transition.</summary>
    public static bool CanTransition(LeadStatus from, LeadStatus to) => Allowed.Contains((from, to));
}
