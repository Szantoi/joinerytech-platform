using MediatR;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.ArchiveHazardousMaterial;

/// <summary>
/// Command to archive (phase out) a hazardous material — lifecycle: Active → Archived
/// </summary>
public record ArchiveHazardousMaterialCommand(
    Guid MaterialId,
    Guid TenantId
) : IRequest<Unit>;
