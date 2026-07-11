using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for CompleteWorkOrderCommand.
/// </summary>
public class CompleteWorkOrderCommandHandler : IRequestHandler<CompleteWorkOrderCommand, Result>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public CompleteWorkOrderCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result> Handle(CompleteWorkOrderCommand request, CancellationToken ct)
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

            // Complete the work order
            // NOTE: CompletionNote validated but not stored in domain (only actualHours)
            workOrder.Complete(request.ActualHours);

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
            return Result.Error($"Failed to complete work order: {ex.Message}");
        }
    }
}
