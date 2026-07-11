using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for ReportWorkOrderCommand.
/// </summary>
public class ReportWorkOrderCommandHandler : IRequestHandler<ReportWorkOrderCommand, Result<WorkOrderId>>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public ReportWorkOrderCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result<WorkOrderId>> Handle(ReportWorkOrderCommand request, CancellationToken ct)
    {
        try
        {
            // Create work order aggregate using factory method
            var workOrder = WorkOrder.Create(
                request.TenantId,
                request.AssetId,
                request.Type,
                request.Priority,
                request.Title,
                request.Description);

            // Persist the work order
            await _workOrderRepository.AddAsync(workOrder, ct).ConfigureAwait(false);

            return Result<WorkOrderId>.Success(workOrder.Id);
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors
            return Result<WorkOrderId>.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors
            return Result<WorkOrderId>.Error($"Failed to report work order: {ex.Message}");
        }
    }
}
