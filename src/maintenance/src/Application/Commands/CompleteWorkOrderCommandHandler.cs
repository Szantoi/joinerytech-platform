using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for CompleteWorkOrderCommand (FSM: InProgress → Completed).
/// NOTE: CompletionNote is validated but not stored in the domain (only actualHours).
/// </summary>
public class CompleteWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<CompleteWorkOrderCommand>
{
    public CompleteWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<CompleteWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "complete";

    protected override void Apply(WorkOrder workOrder, CompleteWorkOrderCommand request)
        => workOrder.Complete(request.ActualHours);
}
