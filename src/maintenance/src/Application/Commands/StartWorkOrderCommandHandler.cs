using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for StartWorkOrderCommand (FSM: Scheduled → InProgress).
/// The aggregate's stored RequiresDowntime flag raises WorkOrderStartedEvent
/// for the Production integration.
/// </summary>
public class StartWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<StartWorkOrderCommand>
{
    public StartWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<StartWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "start";

    protected override void Apply(WorkOrder workOrder, StartWorkOrderCommand request)
        => workOrder.StartWork();
}
