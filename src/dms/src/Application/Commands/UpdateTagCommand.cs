using MediatR;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to update an existing Tag.
/// </summary>
public record UpdateTagCommand(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Color
) : IRequest<bool>;
