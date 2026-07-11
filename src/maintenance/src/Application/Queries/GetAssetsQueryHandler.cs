using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.Services;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Handler for GetAssetsQuery.
/// </summary>
public class GetAssetsQueryHandler : IRequestHandler<GetAssetsQuery, Result<AssetListDto[]>>
{
    private readonly IAssetRepository _assetRepository;
    private readonly IWorkOrderRepository _workOrderRepository;
    private readonly IAssetStatusCalculationService _assetStatusService;

    public GetAssetsQueryHandler(
        IAssetRepository assetRepository,
        IWorkOrderRepository workOrderRepository,
        IAssetStatusCalculationService assetStatusService)
    {
        _assetRepository = assetRepository;
        _workOrderRepository = workOrderRepository;
        _assetStatusService = assetStatusService;
    }

    public async Task<Result<AssetListDto[]>> Handle(GetAssetsQuery request, CancellationToken ct)
    {
        try
        {
            // Get assets by kind (repository doesn't have GetAll, so we enumerate by kind)
            List<Domain.Aggregates.Asset> assetList;
            if (request.Kind.HasValue)
            {
                var assets = await _assetRepository
                    .GetActiveByKindAsync(TenantId.From(request.TenantId), request.Kind.Value, ct)
                    .ConfigureAwait(false);
                assetList = assets.ToList();
            }
            else
            {
                // Enumerate all AssetKind values and fetch all
                var allKinds = Enum.GetValues<Domain.Enums.AssetKind>();
                var tasks = allKinds.Select(kind =>
                    _assetRepository.GetActiveByKindAsync(TenantId.From(request.TenantId), kind, ct));
                var results = await Task.WhenAll(tasks).ConfigureAwait(false);
                assetList = results.SelectMany(x => x).ToList();
            }

            // Get active work orders for all assets (for status calculation)
            // Repository doesn't have GetAll, so we fetch per asset
            var workOrderTasks = assetList.Select(asset =>
                _workOrderRepository.GetActiveByAssetAsync(asset.Id, ct));
            var workOrderResults = await Task.WhenAll(workOrderTasks).ConfigureAwait(false);
            var allWorkOrders = workOrderResults.SelectMany(x => x).ToList();

            // Map to DTOs with computed status
            var dtos = new List<AssetListDto>();
            foreach (var asset in assetList)
            {
                var assetWorkOrders = allWorkOrders.Where(wo => wo.AssetId.Value == asset.Id.Value).ToList();
                var computedStatus = _assetStatusService.GetAssetStatus(asset, assetWorkOrders);

                // Apply Status filter (on computed status)
                if (request.Status.HasValue && computedStatus != request.Status.Value)
                {
                    continue;
                }

                dtos.Add(new AssetListDto(
                    Id: asset.Id.Value,
                    Kind: asset.Kind,
                    Code: asset.Code,
                    Name: asset.Name,
                    Status: computedStatus,
                    Retired: asset.Retired
                ));
            }

            // Apply pagination
            var paginatedDtos = dtos
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToArray();

            return Result<AssetListDto[]>.Success(paginatedDtos);
        }
        catch (Exception ex)
        {
            return Result<AssetListDto[]>.Error($"Failed to retrieve assets: {ex.Message}");
        }
    }
}
