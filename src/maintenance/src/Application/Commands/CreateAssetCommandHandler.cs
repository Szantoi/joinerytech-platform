using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for CreateAssetCommand.
/// </summary>
public class CreateAssetCommandHandler : IRequestHandler<CreateAssetCommand, Result<AssetId>>
{
    private readonly IAssetRepository _assetRepository;

    public CreateAssetCommandHandler(IAssetRepository assetRepository)
    {
        _assetRepository = assetRepository;
    }

    public async Task<Result<AssetId>> Handle(CreateAssetCommand request, CancellationToken ct)
    {
        try
        {
            // Create asset aggregate using factory method
            var asset = Asset.Create(
                request.TenantId,
                request.Code,
                request.Name,
                request.Kind,
                request.FacilityId,
                request.Location);

            // Persist the asset
            await _assetRepository.AddAsync(asset, ct).ConfigureAwait(false);

            return Result<AssetId>.Success(asset.Id);
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors
            return Result<AssetId>.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors
            return Result<AssetId>.Error($"Failed to create asset: {ex.Message}");
        }
    }
}
