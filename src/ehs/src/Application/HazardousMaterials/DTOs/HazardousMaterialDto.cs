using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

/// <summary>
/// Hazardous material detail — SdsValidity is calculated, never stored.
/// </summary>
public record HazardousMaterialDto(
    Guid MaterialId,
    Guid TenantId,
    string Name,
    string Supplier,
    string? CasNumber,
    List<string> GhsHazardClasses,
    Guid StorageLocationId,
    decimal QuantityOnSite,
    string Unit,
    Guid? SdsDocumentId,
    DateTimeOffset SdsIssuedAt,
    DateTimeOffset SdsExpiresAt,
    MaterialStatus Status,
    SdsValidity SdsValidity,
    DateTimeOffset RegisteredAt
);

/// <summary>Compact list row for the SDS registry table</summary>
public record HazardousMaterialListItemDto(
    Guid MaterialId,
    string Name,
    string Supplier,
    Guid StorageLocationId,
    decimal QuantityOnSite,
    string Unit,
    DateTimeOffset SdsExpiresAt,
    MaterialStatus Status,
    SdsValidity SdsValidity
);
