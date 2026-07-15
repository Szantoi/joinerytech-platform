using MediatR;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RegisterHazardousMaterial;

/// <summary>
/// Command to register a new hazardous material in the SDS registry
/// </summary>
public record RegisterHazardousMaterialCommand(
    Guid TenantId,
    string Name,
    string Supplier,
    Guid StorageLocationId,
    decimal QuantityOnSite,
    string Unit,
    DateTimeOffset SdsIssuedAt,
    DateTimeOffset SdsExpiresAt,
    string? CasNumber,
    List<string>? GhsHazardClasses,
    Guid? SdsDocumentId
) : IRequest<Guid>;
