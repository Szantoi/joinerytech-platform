using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Exceptions;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Shared pipeline for work order transition/assignment commands:
/// load aggregate → apply domain action → persist → return the FRESH WorkOrderDto
/// (portal UI contract: optimistic update + detail-cache write needs the updated state).
/// Error contract (mirrors EHS + the portal MSW):
///   missing work order      → Result.NotFound  (API 404)
///   state conflict          → Result.Conflict  (API 409) — WorkOrderStateConflictException
///   domain input validation → Result.Invalid   (API 400) — DomainException
/// </summary>
public abstract class WorkOrderTransitionHandlerBase<TCommand> : IRequestHandler<TCommand, Result<WorkOrderDto>>
    where TCommand : IWorkOrderTransitionCommand, IRequest<Result<WorkOrderDto>>
{
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetRepository _assetRepository;
    private readonly ILogger _logger;

    protected WorkOrderTransitionHandlerBase(
        IWorkOrderRepository workOrderRepository,
        IAssetRepository assetRepository,
        ILogger logger)
    {
        _workOrderRepository = workOrderRepository;
        _assetRepository = assetRepository;
        _logger = logger;
    }

    /// <summary>Action name used in log entries (e.g. "schedule").</summary>
    protected abstract string ActionName { get; }

    /// <summary>Executes the aggregate action (may throw domain exceptions).</summary>
    protected abstract void Apply(WorkOrder workOrder, TCommand request);

    public async Task<Result<WorkOrderDto>> Handle(TCommand request, CancellationToken ct)
    {
        var workOrder = await _workOrderRepository
            .GetByIdAsync(request.WorkOrderId, ct)
            .ConfigureAwait(false);

        if (workOrder == null)
        {
            return Result<WorkOrderDto>.NotFound($"Work order with ID '{request.WorkOrderId}' not found");
        }

        try
        {
            Apply(workOrder, request);
        }
        catch (WorkOrderStateConflictException ex)
        {
            _logger.LogWarning(
                "Work order {WorkOrderId} {Action} rejected (status: {Status}): {Reason}",
                request.WorkOrderId.Value, ActionName, workOrder.Status, ex.Message);
            return Result<WorkOrderDto>.Conflict(ex.Message);
        }
        catch (DomainException ex)
        {
            return Result<WorkOrderDto>.Invalid(new ValidationError(ex.Message));
        }

        await _workOrderRepository.UpdateAsync(workOrder, ct).ConfigureAwait(false);

        var asset = await _assetRepository
            .GetByIdAsync(workOrder.AssetId, ct)
            .ConfigureAwait(false);

        _logger.LogInformation(
            "Work order {WorkOrderId} {Action} executed (status: {Status})",
            request.WorkOrderId.Value, ActionName, workOrder.Status);

        return Result<WorkOrderDto>.Success(WorkOrderDtoMapper.ToDto(workOrder, asset?.Code, asset?.Name));
    }
}
