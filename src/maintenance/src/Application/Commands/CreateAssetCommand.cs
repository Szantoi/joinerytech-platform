using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to create a new asset.
/// </summary>
public record CreateAssetCommand(
    AssetKind Kind,
    string Code,
    string Name,
    string Location,
    Guid TenantId,
    Guid FacilityId
) : IRequest<Result<AssetId>>;
