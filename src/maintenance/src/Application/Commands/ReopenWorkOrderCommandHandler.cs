using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for ReopenWorkOrderCommand.
/// </summary>
public class ReopenWorkOrderCommandHandler : IRequestHandler<ReopenWorkOrderCommand, Result>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public ReopenWorkOrderCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result> Handle(ReopenWorkOrderCommand request, CancellationToken ct)
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

            // Reopen the work order
            // NOTE: Reason is validated but not stored in domain (FSM transition only)
            workOrder.Reopen();

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
            return Result.Error($"Failed to reopen work order: {ex.Message}");
        }
    }
}
