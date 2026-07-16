namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Document lifecycle status — mirror of the portal DOCUMENT_FSM canonical set
/// (fsm.ts: piszkozat → ellenorzes → kiadott → archivalt), extended with the
/// admin-level soft-delete state.
///
/// REMAP from the legacy set (DMS-BE-HOST, data-preserving intent):
///   Active   → Released  (a "live" document is the released one)
///   Archived → Archived  (unchanged)
///   Deleted  → Deleted   (stays admin-level soft delete — NOT part of the FSM)
/// No document rows were ever persisted with the legacy values (the Document
/// aggregate had no persistence layer), so the remap is semantic only.
///
/// Wire format: strings via JsonStringEnumConverter(CamelCase) — "draft",
/// "underReview", "released", "archived". The portal's Hungarian canonical keys
/// (piszkozat/ellenorzes/kiadott/archivalt) map 1:1 in this order — the wire
/// language (Hungarian vs English) is a documented ADR candidate shared with
/// the QA/Maintenance modules.
/// </summary>
public enum DocumentStatus
{
    /// <summary>Working copy (portal: piszkozat).</summary>
    Draft = 0,

    /// <summary>Submitted for review (portal: ellenorzes).</summary>
    UnderReview = 1,

    /// <summary>Approved and released — the shop floor uses this version (portal: kiadott).</summary>
    Released = 2,

    /// <summary>Archived side-state (portal: archivalt).</summary>
    Archived = 3,

    /// <summary>Admin-level soft delete — outside the approval FSM, hidden from listings.</summary>
    Deleted = 4
}
