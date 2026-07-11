using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for AddWorkOrderPartCommand.
/// </summary>
public class AddWorkOrderPartCommandHandler : IRequestHandler<AddWorkOrderPartCommand, Result>
{
    private readonly IWorkOrderRepository _workOrderRepository;

    public AddWorkOrderPartCommandHandler(IWorkOrderRepository workOrderRepository)
    {
        _workOrderRepository = workOrderRepository;
    }

    public async Task<Result> Handle(AddWorkOrderPartCommand request, CancellationToken ct)
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

            // Add part to work order (WorkOrder.AddPart creates the WorkOrderPart internally)
            var unitPrice = Money.Create(request.UnitPrice, "HUF");
            workOrder.AddPart(
                request.PartName, // catalogCode
                request.Quantity,
                unitPrice);

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
            return Result.Error($"Failed to add part to work order: {ex.Message}");
        }
    }
}
