namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Document lifecycle status using FSM pattern.
/// </summary>
public enum DocumentStatus
{
    Active = 0,
    Archived = 1,
    Deleted = 2
}
