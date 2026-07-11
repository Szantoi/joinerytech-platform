using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get a single asset by ID.
/// </summary>
public record GetAssetQuery(
    AssetId AssetId,
    Guid TenantId
) : IRequest<Result<AssetDto>>;
