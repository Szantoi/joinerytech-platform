using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.RemoveOverheadRule;

/// <summary>
/// Handler: Remove overhead rule from OverheadConfig
/// </summary>
public class RemoveOverheadRuleCommandHandler : IRequestHandler<RemoveOverheadRuleCommand, Result<Guid>>
{
    private readonly IOverheadConfigRepository _repository;

    public RemoveOverheadRuleCommandHandler(IOverheadConfigRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<Guid>> Handle(RemoveOverheadRuleCommand request, CancellationToken ct)
    {
        var config = await _repository
            .GetByTenantAsync(request.TenantId, ct)
            .ConfigureAwait(false);

        if (config is null)
        {
            return Result<Guid>.NotFound("Overhead configuration not found");
        }

        try
        {
            config.RemoveRule(request.Category, request.UpdatedBy);

            await _repository.SaveAsync(config, ct).ConfigureAwait(false);

            return Result<Guid>.Success(config.OverheadConfigId);
        }
        catch (InvalidOperationException ex)
        {
            return Result<Guid>.Error(ex.Message);
        }
    }
}
