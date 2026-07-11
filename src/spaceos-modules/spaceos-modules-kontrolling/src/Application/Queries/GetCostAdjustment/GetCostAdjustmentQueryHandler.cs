using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Queries.GetCostAdjustment;

/// <summary>
/// Handler: Get cost adjustment by ID
/// </summary>
public class GetCostAdjustmentQueryHandler : IRequestHandler<GetCostAdjustmentQuery, Result<CostAdjustmentDto>>
{
    private readonly ICostAdjustmentRepository _repository;

    public GetCostAdjustmentQueryHandler(ICostAdjustmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<CostAdjustmentDto>> Handle(GetCostAdjustmentQuery request, CancellationToken ct)
    {
        var adjustment = await _repository
            .GetByIdAsync(request.CostAdjustmentId, request.TenantId, ct)
            .ConfigureAwait(false);

        if (adjustment is null || adjustment.IsDeleted)
        {
            return Result<CostAdjustmentDto>.NotFound("Cost adjustment not found");
        }

        var dto = new CostAdjustmentDto(
            CostAdjustmentId: adjustment.AdjustmentId,
            ProjectId: adjustment.ProjectId ?? Guid.Empty,
            TenantId: adjustment.TenantId,
            Reason: adjustment.Reason,
            AdjustmentAmount: new MoneyDto(adjustment.Amount.Amount, adjustment.Amount.Currency),
            Category: adjustment.Category,
            Scope: adjustment.Scope,
            CreatedAt: adjustment.CreatedAt,
            CreatedBy: adjustment.CreatedBy,
            IsDeleted: adjustment.IsDeleted
        );

        return Result<CostAdjustmentDto>.Success(dto);
    }
}
