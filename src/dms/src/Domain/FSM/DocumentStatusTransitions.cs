using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.FSM;

/// <summary>
/// Document approval-workflow FSM table — the SINGLE source of truth for
/// allowed transitions, mirroring the portal DOCUMENT_FSM 1:1
/// (src/joinerytech-portal/src/modules/dms/services/fsm.ts):
///
///     Action   from                to
///     ───────  ─────────────────   ───────────
///     submit   Draft               UnderReview
///     approve  UnderReview         Released
///     reject   UnderReview         Draft
///     recall   Released            UnderReview
///     archive  Draft | Released    Archived     (not allowed DURING review)
///     reopen   Archived            Draft
///
/// ADR note (DMS-BE-HOST): the task brief paraphrased recall as
/// Released → Draft and reopen as Archived → Released; the FIXED contract is
/// the portal MSW table above (recall → UnderReview, reopen → Draft), and per
/// the brief the backend follows the portal — see DMS-BE-HOST.md.
/// Deleted is an admin-level soft-delete state outside this FSM: no approval
/// action is valid on (or into) a deleted document.
/// </summary>
public static class DocumentStatusTransitions
{
    private static readonly IReadOnlyDictionary<DocumentAction, (DocumentStatus[] From, DocumentStatus To)> Rules =
        new Dictionary<DocumentAction, (DocumentStatus[], DocumentStatus)>
        {
            [DocumentAction.Submit] = (new[] { DocumentStatus.Draft }, DocumentStatus.UnderReview),
            [DocumentAction.Approve] = (new[] { DocumentStatus.UnderReview }, DocumentStatus.Released),
            [DocumentAction.Reject] = (new[] { DocumentStatus.UnderReview }, DocumentStatus.Draft),
            [DocumentAction.Recall] = (new[] { DocumentStatus.Released }, DocumentStatus.UnderReview),
            // Portal comment mirror: a document under review cannot be archived (decision first)
            [DocumentAction.Archive] = (new[] { DocumentStatus.Draft, DocumentStatus.Released }, DocumentStatus.Archived),
            [DocumentAction.Reopen] = (new[] { DocumentStatus.Archived }, DocumentStatus.Draft),
        };

    /// <summary>All configured actions (test enumeration helper).</summary>
    public static IEnumerable<DocumentAction> Actions => Rules.Keys;

    /// <summary>True when <paramref name="action"/> is allowed from <paramref name="from"/>.</summary>
    public static bool CanTransition(DocumentAction action, DocumentStatus from)
        => Rules[action].From.Contains(from);

    /// <summary>Target status of <paramref name="action"/>.</summary>
    public static DocumentStatus TargetOf(DocumentAction action) => Rules[action].To;

    /// <summary>Allowed source statuses of <paramref name="action"/> (test helper).</summary>
    public static IReadOnlyList<DocumentStatus> SourcesOf(DocumentAction action) => Rules[action].From;
}
