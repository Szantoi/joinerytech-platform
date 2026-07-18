namespace SpaceOS.Modules.DMS.Api;

using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// The DMS module's wire vocabulary (ADR-059, kontrolling precedent).
/// </summary>
/// <remarks>
/// Enums travel as strings, but the contract spellings are a TRANSLATION, not a
/// convention: the canonical wire keys are the portal's Hungarian zod-schema
/// literals (<c>DocumentStatus.Draft</c> is <c>"piszkozat"</c>,
/// <c>DocType.Drawing</c> is <c>"rajz"</c>) while the domain stays English. No
/// naming policy derives those, so each map is written out explicitly and is
/// the single place the wire vocabulary is defined — the JSON converters
/// (AddDmsApiJsonOptions), the query-string binding and the 409 guard-message
/// seam all read it.
/// </remarks>
public static class DmsWire
{
    /// <summary>
    /// Approval-workflow status keys (portal fsm.ts canonical set).
    /// <c>Deleted</c> is the admin-level soft-delete OUTSIDE the FSM and never
    /// crosses the wire (soft-deleted documents are invisible on every read
    /// path) — it still has a spelling because the map must be TOTAL for the
    /// fail-fast constructor guarantee (ADR-059: a member without a wire name
    /// fails at startup, not at serialization time).
    /// </summary>
    public static readonly EnumWireMap<DocumentStatus> Status = new(
        new Dictionary<DocumentStatus, string>
        {
            [DocumentStatus.Draft] = "piszkozat",
            [DocumentStatus.UnderReview] = "ellenorzes",
            [DocumentStatus.Released] = "kiadott",
            [DocumentStatus.Archived] = "archivalt",
            [DocumentStatus.Deleted] = "torolve"
        });

    /// <summary>Document-type keys (prototype DOC_TYPE_META canonical set).</summary>
    public static readonly EnumWireMap<DocType> Type = new(
        new Dictionary<DocType, string>
        {
            [DocType.Drawing] = "rajz",
            [DocType.Contract] = "szerzodes",
            [DocType.Certificate] = "tanusitvany",
            [DocType.Instruction] = "utasitas",
            [DocType.Other] = "egyeb"
        });

    /// <summary>Display link-type keys (prototype DOC_LINK_META canonical set).</summary>
    public static readonly EnumWireMap<DocLinkType> LinkType = new(
        new Dictionary<DocLinkType, string>
        {
            [DocLinkType.Project] = "project",
            [DocLinkType.Order] = "order",
            [DocLinkType.Catalog] = "catalog",
            [DocLinkType.Template] = "template",
            [DocLinkType.Customer] = "customer",
            [DocLinkType.None] = "none"
        });

    /// <summary>Computed expiry-state keys (portal expiryState mirror).</summary>
    public static readonly EnumWireMap<ExpiryState> Expiry = new(
        new Dictionary<ExpiryState, string>
        {
            [ExpiryState.Expired] = "lejart",
            [ExpiryState.Expiring] = "lejaro"
        });
}
