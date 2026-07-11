namespace SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Cost category for project cost tracking
/// </summary>
public enum CostCategory
{
    /// <summary>
    /// Material costs from warehouse receipts
    /// </summary>
    Material = 1,

    /// <summary>
    /// Labor costs from HR time logs
    /// </summary>
    Labor = 2,

    /// <summary>
    /// Subcontracting costs from B2B handshakes
    /// </summary>
    Subcontracting = 3,

    /// <summary>
    /// Logistics and shipment costs
    /// </summary>
    Logistics = 4,

    /// <summary>
    /// Supplier costs from inbound invoices
    /// </summary>
    Supplier = 5,

    /// <summary>
    /// Overhead costs (calculated percentage)
    /// </summary>
    Overhead = 6
}
