using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Queries.GetPortfolioCostAdjustments;

/// <summary>
/// Handler: Get portfolio-level cost adjustments
/// </summary>
public class GetPortfolioCostAdjustmentsQueryHandler : IRequestHandler<GetPortfolioCostAdjustmentsQuery, Result<IReadOnlyList<CostAdjustmentListDto>>>
{
    private readonly ICostAdjustmentRepository _repository;

    public GetPortfolioCostAdjustmentsQueryHandler(ICostAdjustmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<IReadOnlyList<CostAdjustmentListDto>>> Handle(
        GetPortfolioCostAdjustmentsQuery request,
        CancellationToken ct)
    {
        var adjustments = await _repository
            .GetPortfolioAdjustmentsAsync(request.TenantId, ct)
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
