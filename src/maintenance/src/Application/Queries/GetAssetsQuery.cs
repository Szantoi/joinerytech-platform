using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get a paginated list of assets with optional filters.
/// </summary>
public record GetAssetsQuery(
    AssetKind? Kind,
    AssetStatus? Status,
    int Page,
    int PageSize,
    Guid TenantId
) : IRequest<Result<AssetListDto[]>>;
