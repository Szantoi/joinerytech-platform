using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for ReopenWorkOrderCommand (FSM: Postponed/Rejected → Reported).
/// </summary>
public class ReopenWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<ReopenWorkOrderCommand>
{
    public ReopenWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<ReopenWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "reopen";

    protected override void Apply(WorkOrder workOrder, ReopenWorkOrderCommand request)
        => workOrder.Reopen();
}
