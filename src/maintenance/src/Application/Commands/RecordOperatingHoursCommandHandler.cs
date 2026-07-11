using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Repositories;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Handler for RecordOperatingHoursCommand.
/// </summary>
public class RecordOperatingHoursCommandHandler : IRequestHandler<RecordOperatingHoursCommand, Result>
{
    private readonly IAssetRepository _assetRepository;

    public RecordOperatingHoursCommandHandler(IAssetRepository assetRepository)
    {
        _assetRepository = assetRepository;
    }

    public async Task<Result> Handle(RecordOperatingHoursCommand request, CancellationToken ct)
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

            // Record operating hours
            asset.RecordOperatingHours(request.Hours);

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
            return Result.Error($"Failed to record operating hours: {ex.Message}");
        }
    }
}
