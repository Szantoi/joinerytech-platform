using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for ReactivateAssetCommand.
/// </summary>
public class ReactivateAssetCommandHandler : IRequestHandler<ReactivateAssetCommand, Result>
{
    private readonly IAssetRepository _assetRepository;

    public ReactivateAssetCommandHandler(IAssetRepository assetRepository)
    {
        _assetRepository = assetRepository;
    }

    public async Task<Result> Handle(ReactivateAssetCommand request, CancellationToken ct)
    {
        try
        {
            var asset = await _assetRepository
                .GetByIdAsync(request.AssetId, ct)
                .ConfigureAwait(false);

            if (asset == null)
            {
                return Result.NotFound($"Asset with ID '{request.AssetId}' not found");
            }

            // Reactivate the asset
            asset.Reactivate();

            await _assetRepository.UpdateAsync(asset, ct).ConfigureAwait(false);

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
            return Result.Error($"Failed to reactivate asset: {ex.Message}");
        }
    }
}
