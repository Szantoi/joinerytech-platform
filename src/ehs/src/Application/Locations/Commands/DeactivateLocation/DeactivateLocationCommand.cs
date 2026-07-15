using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.DeactivateLocation;

/// <summary>
/// Command to soft-deactivate a location (instead of hard delete)
/// </summary>
public record DeactivateLocationCommand(
    Guid LocationId,
    Guid TenantId
) : IRequest<Unit>;
