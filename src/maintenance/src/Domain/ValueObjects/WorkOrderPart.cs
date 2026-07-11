using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.Maintenance.Domain.ValueObjects;

/// <summary>
/// Work order part value object
/// </summary>
public record WorkOrderPart
{
    public string Id { get; init; } = null!;
    public string CatalogCode { get; init; } = null!;
    public int Quantity { get; init; }
    public Money UnitPrice { get; init; } = null!;
    public Money TotalPrice => Money.Create(UnitPrice.Amount * Quantity, UnitPrice.Currency);

    private WorkOrderPart() { }

    public static WorkOrderPart Create(
        string catalogCode,
        int quantity,
        Money unitPrice)
    {
        if (string.IsNullOrWhiteSpace(catalogCode))
            throw new DomainException("CatalogCode is required");
        if (quantity <= 0)
            throw new DomainException("Quantity must be positive");
        if (unitPrice == null || !unitPrice.IsPositive)
            throw new DomainException("UnitPrice must be positive");

        return new WorkOrderPart
        {
            Id = Guid.NewGuid().ToString(),
            CatalogCode = catalogCode,
            Quantity = quantity,
            UnitPrice = unitPrice
        };
    }
}
