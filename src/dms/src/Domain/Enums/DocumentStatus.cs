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
/// Wire format (ADR-059): the portal's canonical Hungarian keys via the shared
/// EnumWireMap seam (Api/WireEnums.cs — DmsWire.Status) — Draft="piszkozat",
/// UnderReview="ellenorzes", Released="kiadott", Archived="archivalt". Member
/// names stay English domain vocabulary; the translation lives only at the
/// serialization seam.
/// </summary>
public enum DocumentStatus
{
    /// <summary>Working copy (wire: "piszkozat").</summary>
    Draft = 0,

    /// <summary>Submitted for review (wire: "ellenorzes").</summary>
    UnderReview = 1,

    /// <summary>Approved and released — the shop floor uses this version (wire: "kiadott").</summary>
    Released = 2,

    /// <summary>Archived side-state (wire: "archivalt").</summary>
    Archived = 3,

    /// <summary>Admin-level soft delete — outside the approval FSM, hidden from listings.</summary>
    Deleted = 4
}
