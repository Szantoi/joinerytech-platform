namespace SpaceOS.Modules.Maintenance.Domain.Enums;

/// <summary>
/// Asset kind (equipment type)
/// </summary>
public enum AssetKind
{
    Machine = 0,         // Production CNC/Lathe/etc.
    Vehicle = 1,         // Logistics vans/trucks
    Tool = 2,            // Hand tools, power tools
    Infrastructure = 3,  // HVAC, electrical
    IT = 4,              // Computers, servers, network
    Room = 5             // Facility spaces
}
