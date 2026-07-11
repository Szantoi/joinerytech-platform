using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for ScheduleWorkOrderCommand.
/// </summary>
public class ScheduleWorkOrderCommandHandler : IRequestHandler<ScheduleWorkOrderCommand, Result>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public ScheduleWorkOrderCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result> Handle(ScheduleWorkOrderCommand request, CancellationToken ct)
    {
        try
        {
            var workOrder = await _workOrderRepository
                .GetByIdAsync(request.WorkOrderId, ct)
                .ConfigureAwait(false);

            if (workOrder == null)
            {
                return Result.NotFound($"Work order with ID '{request.WorkOrderId}' not found");
            }

            // Schedule the work order
            workOrder.Schedule(request.ScheduledStart, request.EstimatedHours);

            await _workOrderRepository.UpdateAsync(workOrder, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors
            return Result.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors
            return Result.Error($"Failed to schedule work order: {ex.Message}");
        }
    }
}
