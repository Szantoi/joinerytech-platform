namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Work order part DTO (nested in WorkOrderDto).
/// </summary>
public record WorkOrderPartDto(
    string CatalogCode,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice
);
