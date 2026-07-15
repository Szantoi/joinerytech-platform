using MediatR;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.UpdateHazardousMaterial;

/// <summary>
/// Command to update master data of a hazardous material
/// (SDS dates are changed via RenewSds, not here)
/// </summary>
public record UpdateHazardousMaterialCommand(
    Guid MaterialId,
    Guid TenantId,
    string Name,
    string Supplier,
    Guid StorageLocationId,
    decimal QuantityOnSite,
    string Unit,
    string? CasNumber,
    List<string>? GhsHazardClasses
) : IRequest<Unit>;
