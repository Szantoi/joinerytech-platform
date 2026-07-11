namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Represents the type of entity a document can be linked to.
/// </summary>
public enum EntityType
{
    Order = 0,
    Project = 1,
    Asset = 2,
    Employee = 3,
    WorkOrder = 4,
    Ticket = 5,
    Lead = 6,
    Opportunity = 7,
    Supplier = 8,
    PurchaseOrder = 9
}
