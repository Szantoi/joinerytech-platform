using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Locations.DTOs;

/// <summary>
/// Flat location node — clients build the tree from ParentLocationId.
/// </summary>
public record EhsLocationDto(
    Guid LocationId,
    Guid TenantId,
    string Code,
    string Name,
    Guid? ParentLocationId,
    LocationKind Kind,
    bool IsActive,
    DateTimeOffset CreatedAt
);
