namespace SpaceOS.Collaboration.Application.Adapters;

public class InMemoryProcurementAdapter : IProcurementAdapter
{
    private readonly Dictionary<Guid, SubcontractOrderReference> _orders = new();

    public void RegisterOrder(SubcontractOrderReference order)
    {
        _orders[order.SubcontractOrderId] = order;
    }

    public Task<SubcontractOrderReference?> GetSubcontractOrderRefAsync(Guid subcontractOrderId, Guid requestingTenantId, CancellationToken cancellationToken = default)
    {
        if (_orders.TryGetValue(subcontractOrderId, out var order))
        {
            if (order.BuyerTenantId == requestingTenantId)
                return Task.FromResult<SubcontractOrderReference?>(order);
        }

        return Task.FromResult<SubcontractOrderReference?>(null);
    }
}
