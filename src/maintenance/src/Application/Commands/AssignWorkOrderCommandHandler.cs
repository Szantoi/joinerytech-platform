using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for AssignWorkOrderCommand.
/// </summary>
public class AssignWorkOrderCommandHandler : IRequestHandler<AssignWorkOrderCommand, Result>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public AssignWorkOrderCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result> Handle(AssignWorkOrderCommand request, CancellationToken ct)
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

            // Assign the work order based on assignment type
            if (request.AssignmentType == Domain.Enums.AssignmentType.Internal)
            {
                workOrder.AssignInternalTechnician(request.AssignedTo);
            }
            else
            {
                workOrder.AssignExternalContractor(request.AssignedTo);
            }

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
            return Result.Error($"Failed to assign work order: {ex.Message}");
        }
    }
}
