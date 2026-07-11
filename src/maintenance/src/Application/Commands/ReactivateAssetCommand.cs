using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to reactivate a retired asset.
/// </summary>
public record ReactivateAssetCommand(
    AssetId AssetId,
    Guid TenantId
) : IRequest<Result>;
