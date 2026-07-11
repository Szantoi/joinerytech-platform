using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for RemoveWorkOrderPartCommand.
/// </summary>
public class RemoveWorkOrderPartCommandHandler : IRequestHandler<RemoveWorkOrderPartCommand, Result>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public RemoveWorkOrderPartCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result> Handle(RemoveWorkOrderPartCommand request, CancellationToken ct)
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

            if (request.PartIndex < 0 || request.PartIndex >= workOrder.Parts.Count)
            {
                return Result.Error($"Invalid part index: {request.PartIndex}. Work order has {workOrder.Parts.Count} parts.");
            }

            // Get the part at the specified index
            var partToRemove = workOrder.Parts[request.PartIndex];

            // Remove part from work order (by ID)
            workOrder.RemovePart(partToRemove.Id);

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
            return Result.Error($"Failed to remove part from work order: {ex.Message}");
        }
    }
}
