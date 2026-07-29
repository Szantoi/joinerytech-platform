namespace SpaceOS.Collaboration.Application.Adapters;

public record SubcontractOrderReference(Guid SubcontractOrderId, Guid BuyerTenantId, string OrderNumber, decimal TotalAmount);

public interface IProcurementAdapter
{
    Task<SubcontractOrderReference?> GetSubcontractOrderRefAsync(Guid subcontractOrderId, Guid requestingTenantId, CancellationToken cancellationToken = default);
}
