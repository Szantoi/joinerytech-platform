namespace SpaceOS.Modules.DMS.Domain.FSM;

/// <summary>
/// Approval-workflow actions on a Document — the portal DOCUMENT_FSM action
/// keys 1:1 (fsm.ts: submit/approve/reject/recall/archive/reopen).
/// </summary>
public enum DocumentAction
{
    /// <summary>Send for review (Draft → UnderReview).</summary>
    Submit = 0,

    /// <summary>Approve — release (UnderReview → Released).</summary>
    Approve = 1,

    /// <summary>Reject with mandatory reason (UnderReview → Draft).</summary>
    Reject = 2,

    /// <summary>Start re-review of a released document (Released → UnderReview).</summary>
    Recall = 3,

    /// <summary>Archive (Draft | Released → Archived; not allowed during review).</summary>
    Archive = 4,

    /// <summary>Reopen an archived document as a working copy (Archived → Draft).</summary>
    Reopen = 5
}
