namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Document type — the prototype DOC_TYPE_META canonical keys (portal
/// docTypeSchema mirror). Member names are the Hungarian canonical keys so the
/// camelCase wire format matches the portal contract exactly
/// ("rajz", "szerzodes", "tanusitvany", "utasitas", "egyeb").
/// </summary>
public enum DocType
{
    /// <summary>Műszaki/kiviteli rajz.</summary>
    Rajz = 0,

    /// <summary>Szerződés.</summary>
    Szerzodes = 1,

    /// <summary>Tanúsítvány (pl. FSC, CE).</summary>
    Tanusitvany = 2,

    /// <summary>Munkautasítás / SOP.</summary>
    Utasitas = 3,

    /// <summary>Egyéb dokumentum.</summary>
    Egyeb = 4
}
