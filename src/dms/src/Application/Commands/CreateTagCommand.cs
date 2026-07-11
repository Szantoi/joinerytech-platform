using MediatR;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to create a new Tag.
/// </summary>
public record CreateTagCommand(
    Guid TenantId,
    string Name,
    string? Color
) : IRequest<Guid>;
