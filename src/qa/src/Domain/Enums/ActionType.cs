namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Resolution action type
/// </summary>
public enum ActionType
{
    Repair = 0,       // Javítás
    Replace = 1,      // Csere
    Refund = 2,       // Visszatérítés
    NoAction = 3      // Nincs teendő (pl. nem indokolt reklamáció)
}
