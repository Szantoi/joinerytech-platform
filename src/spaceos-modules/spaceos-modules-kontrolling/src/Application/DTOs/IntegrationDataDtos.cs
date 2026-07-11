namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Integration data aggregated from all modules
/// </summary>
public record ProjectIntegrationData(
    Revenue Revenue,
    MfgPrepCostData? MfgPrepData,
    IEnumerable<TimeLogCostData> TimeLogs,
    IEnumerable<WarehouseReceiptData> WarehouseReceipts,
    IEnumerable<ShipmentCostData> Shipments,
    IEnumerable<InboundInvoiceData> SupplierInvoices
);

/// <summary>
/// Manufacturing preparation cost data (from Production module)
/// </summary>
public record MfgPrepCostData(
    Guid ProjectId,
    Money MaterialCost,
    Money LaborCost,
    decimal EstimatedLaborHours
);

/// <summary>
/// Time log cost data (from HR module)
/// </summary>
public record TimeLogCostData(
    Guid ProjectId,
    Guid EmployeeId,
    decimal HoursWorked,
    decimal HourlyRate,
    Money CostTotal
);

/// <summary>
/// Inbound invoice data (from Finance module)
/// </summary>
public record InboundInvoiceData(
    Guid InvoiceId,
    Guid ProjectId,
    Guid SupplierId,
    Money Amount,
    DateTime InvoiceDate
);

/// <summary>
/// Warehouse receipt data (from Warehouse module)
/// </summary>
public record WarehouseReceiptData(
    Guid ReceiptId,
    Guid ProjectId,
    Guid MaterialId,
    decimal Quantity,
    Money UnitCost,
    Money TotalCost
);

/// <summary>
/// Shipment cost data (from Logistics module)
/// </summary>
public record ShipmentCostData(
    Guid ShipmentId,
    Guid ProjectId,
    Money EstimatedCost,
    Money? ActualCost
);
