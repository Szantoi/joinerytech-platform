using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for ScheduleWorkOrderCommand (FSM: Reported → Scheduled).
/// </summary>
public class ScheduleWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<ScheduleWorkOrderCommand>
{
    public ScheduleWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<ScheduleWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "schedule";

    protected override void Apply(WorkOrder workOrder, ScheduleWorkOrderCommand request)
        => workOrder.Schedule(request.ScheduledStart, request.EstimatedHours);
}
