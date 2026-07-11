namespace SpaceOS.Modules.Kontrolling.Application.Commands.CreateCostAdjustment;

using MediatR;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Handler for CreateCostAdjustmentCommand
/// </summary>
public sealed class CreateCostAdjustmentCommandHandler
    : IRequestHandler<CreateCostAdjustmentCommand, Guid>
{
    private readonly ICostAdjustmentRepository _repository;
    private readonly IMemoryCache _cache;

    public CreateCostAdjustmentCommandHandler(
        ICostAdjustmentRepository repository,
        IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<Guid> Handle(
        CreateCostAdjustmentCommand request,
        CancellationToken ct)
    {
        var adjustment = CostAdjustment.Create(
            request.TenantId,
            request.ProjectId,
            request.Category,
            new Money(request.Amount, request.Currency),
            request.Scope,
            request.Reason,
            request.CreatedByUserId);

        await _repository.AddAsync(adjustment, ct).ConfigureAwait(false);
        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

        // Invalidate project cost cache
        if (request.ProjectId.HasValue)
        {
            _cache.Remove($"project-cost-{request.ProjectId.Value}");
            _cache.Remove($"project-eac-{request.ProjectId.Value}");
        }

        // Invalidate tenant portfolio cache
        _cache.Remove($"portfolio-summary-{request.TenantId}");

        return adjustment.AdjustmentId;
    }
}
