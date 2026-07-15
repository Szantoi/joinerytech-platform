using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.UpdateLocation;

/// <summary>
/// Command to rename / re-classify / move a location within the tree
/// </summary>
public record UpdateLocationCommand(
    Guid LocationId,
    Guid TenantId,
    string Code,
    string Name,
    LocationKind Kind,
    Guid? ParentLocationId
) : IRequest<Unit>;
