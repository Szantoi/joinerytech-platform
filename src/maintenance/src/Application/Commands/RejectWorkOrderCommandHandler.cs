using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for RejectWorkOrderCommand (FSM: Reported/Scheduled → Rejected).
/// </summary>
public class RejectWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<RejectWorkOrderCommand>
{
    public RejectWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<RejectWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "reject";

    protected override void Apply(WorkOrder workOrder, RejectWorkOrderCommand request)
        => workOrder.Reject(request.Reason);
}
