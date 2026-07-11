using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Queries.ListCostAdjustmentsByProject;

/// <summary>
/// Handler: List cost adjustments for a specific project
/// </summary>
public class ListCostAdjustmentsByProjectQueryHandler : IRequestHandler<ListCostAdjustmentsByProjectQuery, Result<IReadOnlyList<CostAdjustmentListDto>>>
{
    private readonly ICostAdjustmentRepository _repository;

    public ListCostAdjustmentsByProjectQueryHandler(ICostAdjustmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<IReadOnlyList<CostAdjustmentListDto>>> Handle(
        ListCostAdjustmentsByProjectQuery request,
        CancellationToken ct)
    {
        var adjustments = await _repository
            .GetByProjectAsync(request.ProjectId, request.TenantId, ct)
            .ConfigureAwait(false);

        var dtos = adjustments
            .Select(a => new CostAdjustmentListDto(
                CostAdjustmentId: a.AdjustmentId,
                ProjectId: a.ProjectId ?? Guid.Empty,
                Reason: a.Reason,
                AdjustmentAmount: new MoneyDto(a.Amount.Amount, a.Amount.Currency),
                Scope: a.Scope,
                CreatedAt: a.CreatedAt
            ))
            .ToList();

        return Result<IReadOnlyList<CostAdjustmentListDto>>.Success(dtos);
    }
}
