namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Document type — the prototype DOC_TYPE_META canonical set (portal
/// docTypeSchema mirror). Member names are English domain vocabulary (ADR-059);
/// the portal's canonical Hungarian wire keys ("rajz", "szerzodes",
/// "tanusitvany", "utasitas", "egyeb") are applied at the serialization seam
/// (Api/WireEnums.cs — DmsWire.Type). Stored as INTEGER ordinals — keep the
/// explicit values.
/// </summary>
public enum DocType
{
    /// <summary>Műszaki/kiviteli rajz (wire: "rajz").</summary>
    Drawing = 0,

    /// <summary>Szerződés (wire: "szerzodes").</summary>
    Contract = 1,

    /// <summary>Tanúsítvány, pl. FSC, CE (wire: "tanusitvany").</summary>
    Certificate = 2,

    /// <summary>Munkautasítás / SOP (wire: "utasitas").</summary>
    Instruction = 3,

    /// <summary>Egyéb dokumentum (wire: "egyeb").</summary>
    Other = 4
}
