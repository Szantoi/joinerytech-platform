using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to retire an asset.
/// </summary>
public record RetireAssetCommand(
    AssetId AssetId,
    string? Reason,
    Guid TenantId
) : IRequest<Result>;
