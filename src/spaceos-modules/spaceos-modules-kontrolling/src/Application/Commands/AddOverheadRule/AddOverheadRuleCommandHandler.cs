using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.Services;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.AddOverheadRule;

/// <summary>
/// Handler: Add overhead rule to OverheadConfig
/// </summary>
public class AddOverheadRuleCommandHandler : IRequestHandler<AddOverheadRuleCommand, Result<Guid>>
{
    private readonly IOverheadConfigRepository _repository;

    public AddOverheadRuleCommandHandler(IOverheadConfigRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<Guid>> Handle(AddOverheadRuleCommand request, CancellationToken ct)
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
            config.AddRule(
                category: request.Category,
                exclude: request.Exclude,
                customRate: request.CustomRate,
                updatedBy: request.UpdatedBy
            );

            await _repository.SaveAsync(config, ct).ConfigureAwait(false);

            return Result<Guid>.Success(config.OverheadConfigId);
        }
        catch (InvalidOperationException ex)
        {
            return Result<Guid>.Error(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<Guid>.Invalid(new ValidationError(ex.ParamName ?? "CustomRate", ex.Message));
        }
    }
}
