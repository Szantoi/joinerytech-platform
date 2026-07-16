using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for AssignWorkOrderCommand (status-guarded: Reported/Scheduled only).
/// </summary>
public class AssignWorkOrderCommandHandler : WorkOrderTransitionHandlerBase<AssignWorkOrderCommand>
{
    public AssignWorkOrderCommandHandler(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger<AssignWorkOrderCommandHandler> logger)
        : base(workOrderRepository, assetRepository, logger)
    {
    }

    protected override string ActionName => "assign";

    protected override void Apply(WorkOrder workOrder, AssignWorkOrderCommand request)
    {
        if (request.AssignmentType == Domain.Enums.AssignmentType.Internal)
        {
            workOrder.AssignInternalTechnician(request.AssignedTo);
        }
        else
        {
            workOrder.AssignExternalContractor(request.AssignedTo);
        }
    }
}
