using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for PostponeWorkOrderCommand (FSM: Scheduled/InProgress → Postponed).
/// </summary>
public class PostponeWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<PostponeWorkOrderCommand>
{
    public PostponeWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<PostponeWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "postpone";

    protected override void Apply(WorkOrder workOrder, PostponeWorkOrderCommand request)
        => workOrder.Postpone(request.Reason);
}
