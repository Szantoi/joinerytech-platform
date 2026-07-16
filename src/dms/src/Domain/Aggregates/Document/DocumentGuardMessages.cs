using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.FSM;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Document;

/// <summary>
/// Guard messages of the Document approval workflow — 1:1 mirrors of the portal
/// MSW guard texts (fsm.ts / db.ts), so the UI toast shows the same wording
/// whether it comes from the mock or from this backend. Single source for the
/// aggregate and the tests.
/// </summary>
public static class DocumentGuardMessages
{
    /// <summary>MSW guardTransition mirror (409). Status/action rendered with the wire (camelCase) names.</summary>
    public static string InvalidTransition(DocumentStatus from, DocumentAction action)
        => $"Érvénytelen FSM-átmenet: „{Wire(from.ToString())}” állapotból nem hajtható végre a(z) „{Wire(action.ToString())}” művelet.";

    /// <summary>fsm.ts uploadVersionBlockReason mirror (409).</summary>
    public const string UploadVersionArchived =
        "Archivált dokumentumhoz nem tölthető fel új verzió — előbb nyisd újra.";

    /// <summary>Deleted is outside the FSM — admin restore first (409).</summary>
    public const string UploadVersionDeleted =
        "Törölt dokumentumhoz nem tölthető fel új verzió.";

    /// <summary>fsm.ts rejectReasonBlockReason mirror (400).</summary>
    public const string RejectReasonRequired =
        "A visszautasításhoz kötelező az indok megadása.";

    /// <summary>fsm.ts versionFieldsBlockReason mirror — file label (400).</summary>
    public const string VersionFileLabelRequired =
        "Add meg az új verzió fájl-címkéjét.";

    /// <summary>fsm.ts versionFieldsBlockReason mirror — change note (400).</summary>
    public const string VersionChangeNoteRequired =
        "Add meg, mi változott az új verzióban (változás-jegyzet).";

    private static string Wire(string pascal) => char.ToLowerInvariant(pascal[0]) + pascal[1..];
}
