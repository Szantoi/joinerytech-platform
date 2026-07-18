namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Denormalized display link type — what the document belongs to (portal
/// docLinkTypeSchema / prototype DOC_LINK_META mirror). Wire spellings come
/// from the EnumWireMap seam (ADR-059, Api/WireEnums.cs — DmsWire.LinkType) and
/// match the portal contract exactly ("project", "order", "catalog",
/// "template", "customer", "none").
///
/// NOTE: this is the portal-facing single display link; the rich
/// EntityLink list on the aggregate remains the Phase-2 linking model.
/// </summary>
public enum DocLinkType
{
    Project = 0,
    Order = 1,
    Catalog = 2,
    Template = 3,
    Customer = 4,
    None = 5
}
