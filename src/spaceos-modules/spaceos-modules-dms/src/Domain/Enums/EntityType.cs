namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Types of entities that can have documents linked to them.
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
    PurchaseOrder = 9,
    Inspection = 10,
    Other = 99
}
