using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.CreateLocation;

/// <summary>
/// Command to create a new node in the hierarchical location registry
/// </summary>
public record CreateLocationCommand(
    Guid TenantId,
    string Code,
    string Name,
    LocationKind Kind,
    Guid? ParentLocationId
) : IRequest<Guid>;
