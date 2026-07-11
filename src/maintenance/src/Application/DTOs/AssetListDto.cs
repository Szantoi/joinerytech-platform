using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Lightweight asset DTO for list/pagination.
/// </summary>
public record AssetListDto(
    Guid Id,
    AssetKind Kind,
    string Code,
    string Name,
    AssetStatus Status,           // COMPUTED
    bool Retired
);
